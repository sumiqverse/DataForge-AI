import asyncio
from datetime import datetime
from typing import Dict, Any, List
import uuid
from app.database import SessionLocal
from app.models import Task, Source, Dataset, DatasetRecord
from app.schemas.workflow import WorkflowPlan
from app.services.collector_service import CollectionEngine
from app.services.ai_service import extract_and_map_fields, normalize_record, validate_record, deduplicate_records, enrich_record

class TaskRunner:
    @staticmethod
    async def run_task(task_id: int, plan: WorkflowPlan, workspace_id: int, is_enrichment: bool = False, dataset_id: int = None):
        db = SessionLocal()
        try:
            task = db.query(Task).filter(Task.id == task_id).first()
            if not task:
                return
                
            task.status = "RUNNING"
            db.commit()
            
            # The schema we are trying to populate
            schema_def = task.metadata_snapshot.get("context", {}).get("dataset_schema", [])
            schema_keys = [f.get("name", f["name"]) for f in schema_def] if isinstance(schema_def, list) else list(schema_def.keys())

            if is_enrichment and dataset_id:
                # REAL ENRICHMENT LOGIC
                dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
                if not dataset:
                    raise ValueError("Dataset not found")
                
                records = db.query(DatasetRecord).filter(DatasetRecord.dataset_id == dataset_id).all()
                records_enriched = 0
                
                for r in records:
                    new_values = r.values.copy() if r.values else {}
                    needs_update = False
                    
                    try:
                        enriched_values = await asyncio.to_thread(enrich_record, new_values)
                        if enriched_values != new_values:
                            r.values = enriched_values
                            records_enriched += 1
                            r.status = enriched_values.get("_status", r.status)
                            
                            new_prov = r.provenance.copy() if r.provenance else {"transformation_history": []}
                            hist = new_prov.get("transformation_history", [])
                            hist.append(f"AI Enriched values at {datetime.utcnow().isoformat()}")
                            new_prov["transformation_history"] = hist
                            r.provenance = new_prov
                            db.add(r)
                    except Exception as e:
                        TaskRunner._log(task, db, f"Enrichment failed for record {r.id}: {str(e)}", level="error")
                        
                db.commit()
                task.status = "COMPLETED"
                task.results = {
                    "collected_records": [{"id": r.id} for r in records],
                    "enrichment_stats": {"values_added": records_enriched, "values_rejected": 0}
                }
                db.commit()
                return

            raw_documents = []
            
            # 1. COLLECTION
            for step in plan.steps:
                db.refresh(task)
                if task.status == "CANCELLED":
                    TaskRunner._log(task, db, "Task cancelled by user.")
                    return
                    
                TaskRunner._log(task, db, f"Executing step: {step.type}")
                
                current_steps = list(task.steps)
                current_steps.append({"type": step.type, "status": "running"})
                task.steps = current_steps
                db.commit()
                
                if step.type == "collect" and step.source_id:
                    source = db.query(Source).filter(
                        Source.id == step.source_id,
                        Source.workspace_id == workspace_id
                    ).first()
                    
                    if not source:
                        TaskRunner._log(task, db, f"Source {step.source_id} not found or unauthorized.", level="error")
                        current_steps[-1]["status"] = "failed"
                        task.steps = current_steps
                        db.commit()
                        continue
                        
                    config = source.configuration or {}
                    c_type = "api" if source.type not in ["http", "browser"] else source.type
                    
                    max_retries = 3
                    success = False
                    for attempt in range(max_retries):
                        try:
                            collector = CollectionEngine.get_collector(c_type, source.id, config)
                            docs = await collector.collect()
                            raw_documents.extend(docs)
                            success = True
                            TaskRunner._log(task, db, f"Collected {len(docs)} documents from source {source.name}")
                            break
                        except Exception as e:
                            TaskRunner._log(task, db, f"Collection attempt {attempt+1} failed for source {source.name}: {str(e)}", level="warn")
                            await asyncio.sleep(1)
                            
                    if not success:
                        TaskRunner._log(task, db, f"Source {source.id} failed after {max_retries} retries. (SOURCE_UNAVAILABLE)", level="error")
                        current_steps[-1]["status"] = "failed"
                    else:
                        current_steps[-1]["status"] = "completed"
                        
                    task.steps = current_steps
                    db.commit()

            if not raw_documents:
                raise ValueError("No data collected from any sources.")

            # 2. EXTRACTION
            TaskRunner._log(task, db, "Executing EXTRACTION step.")
            extracted_records = []
            for doc in raw_documents:
                try:
                    record_data = await asyncio.to_thread(extract_and_map_fields, doc.raw_content, schema_keys)
                    if record_data:
                        record_data["_source"] = doc.source_id
                        record_data["_source_url"] = doc.url
                        record_data["_retrieved_at"] = doc.metadata.get("retrieved_at", datetime.utcnow().isoformat())
                        extracted_records.append(record_data)
                except Exception as e:
                    TaskRunner._log(task, db, f"Extraction failed for doc from {doc.url}: {str(e)}", level="error")
                    
            if not extracted_records:
                raise ValueError("Extraction failed to produce any records.")

            # 3. NORMALIZATION
            TaskRunner._log(task, db, "Executing NORMALIZATION step.")
            normalized_records = []
            for rec in extracted_records:
                try:
                    norm_rec = await asyncio.to_thread(normalize_record, rec, schema_def)
                    normalized_records.append(norm_rec)
                except Exception as e:
                    TaskRunner._log(task, db, f"Normalization error: {str(e)}", level="warn")
                    normalized_records.append(rec)
                    
            # 4. VALIDATION
            TaskRunner._log(task, db, "Executing VALIDATION step.")
            validated_records = []
            valid_count = 0
            for rec in normalized_records:
                try:
                    val_rec = validate_record(rec, schema_def)
                    validated_records.append(val_rec)
                    if val_rec.get("_status") and "VALID" in val_rec.get("_status"):
                        valid_count += 1
                except Exception as e:
                    TaskRunner._log(task, db, f"Validation error: {str(e)}", level="warn")
                    validated_records.append(rec)

            # 5. DEDUPLICATION
            TaskRunner._log(task, db, "Executing DEDUPLICATION step.")
            deduped_records = deduplicate_records(validated_records)

            # 6. GENERATE DATASET (PERSISTENCE)
            TaskRunner._log(task, db, "Executing DATASET GENERATION step.")
            
            dataset = Dataset(
                project_id=task.project_id,
                name=plan.name or f"Dataset from task {task.id}",
                schema_definition={k: "string" for k in schema_keys}
            )
            db.add(dataset)
            db.commit()
            db.refresh(dataset)
            
            for rec in deduped_records:
                clean_values = {k: v for k, v in rec.items() if not k.startswith("_")}
                prov = {
                    "source_url": rec.get("_source_url", ""),
                    "retrieved_at": rec.get("_retrieved_at", datetime.utcnow().isoformat()),
                    "transformation_history": ["Extracted", "Normalized", "Validated"]
                }
                new_rec = DatasetRecord(
                    id=str(uuid.uuid4()),
                    dataset_id=dataset.id,
                    values=clean_values,
                    status=rec.get("_status", "VALID"),
                    duplicate_status="UNIQUE" if len(rec.get("_sources", [])) <= 1 else "MERGED",
                    provenance=prov
                )
                db.add(new_rec)
            db.commit()

            task.status = "COMPLETED"
            task.results = {
                "collected_records": [{"id": i} for i in range(len(deduped_records))],
                "validation_stats": {"valid": valid_count, "valid_percentage": round(valid_count / max(1, len(validated_records)) * 100, 2)},
                "duplicate_stats": {"merged": len(validated_records) - len(deduped_records)},
                "enrichment_stats": {"values_added": 0, "values_rejected": 0}
            }
            db.commit()
            
        except Exception as e:
            db.rollback()
            try:
                task.status = "FAILED"
                TaskRunner._log(task, db, f"Critical task failure: {str(e)}", level="error")
                db.commit()
            except:
                pass
        finally:
            db.close()
            
    @staticmethod
    def _log(task: Task, db, message: str, level: str = "info"):
        current_logs = list(task.logs)
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message
        }
        current_logs.append(log_entry)
        task.logs = current_logs
