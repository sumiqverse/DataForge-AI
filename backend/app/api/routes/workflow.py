import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models, schemas
from app.api import deps
from app.database import get_db, SessionLocal
from app.services.collector_service import CollectionEngine
from app.services import ai_service

router = APIRouter()

# Using SessionLocal imported from app.database

async def execute_pipeline(task_id: int, workflow_steps: list, requirement_fields: list, project_workspace_id: int):
    db = SessionLocal()
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        db.close()
        return

    field_names = [f["name"] for f in requirement_fields]
    results = {}
    current_records = []
    
    # Initialize steps status
    steps_status = [{"step": f"{idx+1}_{s.get('type')}", "status": "pending"} for idx, s in enumerate(workflow_steps)]
    task.steps = steps_status
    task.status = "RUNNING"
    db.commit()

    try:
        for idx, step in enumerate(workflow_steps):
            step_type = step.get("type")
            step_key = f"{idx+1}_{step_type}"
            
            # Update step to running
            steps_status[idx]["status"] = "running"
            task.steps = list(steps_status)
            db.commit()
            
            if step_type == "collect":
                source_name = step.get("source")
                if not source_name: continue
                source = db.query(models.Source).filter(models.Source.name == source_name, models.Source.workspace_id == project_workspace_id).first()
                if source:
                    collector = CollectionEngine.get_collector(source.extraction_method)
                    raw_records = await collector.collect(source.url_or_api, "", field_names)
                    for r in raw_records: r["_source"] = source.name
                    current_records.extend(raw_records)
                else:
                    collector = CollectionEngine.get_collector("standard_web")
                    raw_records = await collector.collect("http://example.com", "", field_names)
                    for r in raw_records: r["_source"] = source_name
                    current_records.extend(raw_records)
                results[step_key] = current_records.copy()
                
            elif step_type == "normalize":
                normalized_records = []
                for record in current_records:
                    if "error" in record:
                        normalized_records.append(record)
                        continue
                    norm_rec = ai_service.normalize_record(record, requirement_fields)
                    normalized_records.append(norm_rec)
                current_records = normalized_records
                results[step_key] = current_records.copy()
                
            elif step_type == "deduplicate":
                deduped = ai_service.deduplicate_records(current_records)
                current_records = deduped
                results[step_key] = current_records.copy()
                
            elif step_type == "validate":
                validated_records = []
                for record in current_records:
                    if "error" in record:
                        record["_status"] = "NEEDS REVIEW ⚠"
                        record["_validation_errors"] = [record["error"]]
                        validated_records.append(record)
                        continue
                    v_rec = ai_service.validate_record(record, requirement_fields)
                    validated_records.append(v_rec)
                current_records = validated_records
                results[step_key] = current_records.copy()
                
            elif step_type == "generate_dataset":
                results[step_key] = current_records.copy()
                
            # Finish step
            steps_status[idx]["status"] = "completed"
            task.steps = list(steps_status)
            task.results = results
            db.commit()
            
        task.status = "COMPLETED"
        db.commit()
    except Exception as e:
        task.status = "FAILED"
        task.logs = task.logs + [str(e)] if task.logs else [str(e)]
        db.commit()
    finally:
        db.close()


@router.post("/{project_id}/run")
async def start_workflow(
    project_id: int, 
    request_body: dict, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_user)
):
    project = db.query(models.Project).join(models.Workspace).filter(
        models.Project.id == project_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create task
    task = models.Task(project_id=project.id, status="queued")
    db.add(task)
    db.commit()
    db.refresh(task)

    workflow_steps = request_body.get("workflow", {}).get("steps", [])
    requirement_fields = request_body.get("dataset_schema", [])

    # Run pipeline in background
    background_tasks.add_task(execute_pipeline, task.id, workflow_steps, requirement_fields, project.workspace_id)

    return {"status": "started", "task_id": task.id}

@router.get("/task/{task_id}")
async def get_task_status(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "id": task.id,
        "status": task.status,
        "steps": task.steps,
        "logs": task.logs,
        "results": task.results
    }

@router.get("/{project_id}/tasks")
async def get_project_tasks(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    project = db.query(models.Project).join(models.Workspace).filter(
        models.Project.id == project_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = db.query(models.Task).filter(models.Task.project_id == project_id).order_by(models.Task.created_at.desc()).all()
    return [{"id": t.id, "status": t.status, "created_at": t.created_at} for t in tasks]


async def execute_enrichment(task_id: int):
    db = SessionLocal()
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        db.close()
        return
    
    results = dict(task.results) if task.results else {}
    if not results:
        db.close()
        return
        
    final_step_key = sorted(list(results.keys()))[-1]
    records = results[final_step_key].copy()
    
    for i, record in enumerate(records):
        needs_enrichment = False
        for k, v in record.items():
            if not k.startswith("_"):
                val = v.get("value") if isinstance(v, dict) else v
                if val is None or str(val).strip() in ["", "N/A", "None", "null", "-"]:
                    needs_enrichment = True
                    break
        if needs_enrichment:
            records[i] = ai_service.enrich_record(record)
            
    results["enriched"] = records
    
    steps = list(task.steps)
    steps.append({"step": f"{len(steps)+1}_enrich_missing_data", "status": "completed"})
    
    task.results = results
    task.steps = steps
    task.status = "COMPLETED"
    db.commit()
    db.close()

@router.post("/task/{task_id}/enrich/")
async def start_enrichment(task_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.status = "RUNNING"
    db.commit()
    
    background_tasks.add_task(execute_enrichment, task.id)
    return {"status": "started"}


@router.get("/task/{task_id}/insights/")
async def get_task_insights(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    results = dict(task.results) if task.results else {}
    if not results:
        return {"insights": "No data available."}
        
    final_step_key = sorted(list(results.keys()))[-1]
    records = results[final_step_key][:50] # Limit to 50 for prompt size
    
    from app.services.ai_service import genai, settings
    if not hasattr(settings, "GEMINI_API_KEY") or not settings.GEMINI_API_KEY:
        return {"summary": "Dataset contains " + str(len(results[final_step_key])) + " records.", "anomalies": []}
        
    model = genai.GenerativeModel('gemini-3.8-flash', generation_config={"response_mime_type": "application/json"})
    prompt = f"""
    You are an AI Data Analyst. Analyze the following dataset (sample of {len(records)} records).
    Provide:
    1. A short statistical summary (percentages, medians, interesting patterns).
    2. Anomaly detection (e.g., unusually high/low values, weird formats).
    Return strictly JSON: {{ "summary": "markdown string", "anomalies": ["anomaly 1", "anomaly 2"] }}
    
    Data: {json.dumps(records)}
    """
    try:
        res = model.generate_content(prompt)
        return json.loads(res.text)
    except Exception:
        return {"summary": "Failed to generate insights.", "anomalies": []}

