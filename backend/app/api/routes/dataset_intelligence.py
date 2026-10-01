from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import cast, String, Integer, Float, Date, and_
from typing import List, Optional
import json

from app.api import deps
from app.database import get_db
from app.models import Dataset, DatasetRecord, User, Workspace
from app.services.intelligence_service import classify_and_execute_intelligence, IntelligenceIntent
from pydantic import BaseModel

router = APIRouter()

class IntelligenceRequest(BaseModel):
    prompt: str

@router.post("/{dataset_id}/intelligence/query")
async def process_intelligence_query(
    dataset_id: int,
    request: IntelligenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Get a sample to help the LLM with context
    sample_records = db.query(DatasetRecord).filter(DatasetRecord.dataset_id == dataset_id).limit(20).all()
    sample_data = [r.values for r in sample_records if r.values]
    
    try:
        intent_result = classify_and_execute_intelligence(request.prompt, dataset.schema_definition or {}, sample_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if intent_result.intent == "FILTER" and intent_result.filters:
        # Convert AST to SQLAlchemy
        query = db.query(DatasetRecord).filter(DatasetRecord.dataset_id == dataset_id)
        
        for condition in intent_result.filters:
            field = condition.field
            op = condition.operator
            val = condition.value
            
            # Use SQLAlchemy JSON path querying
            json_field = DatasetRecord.values[field].as_string()
            
            if op == "eq":
                query = query.filter(json_field == str(val))
            elif op == "neq":
                query = query.filter(json_field != str(val))
            elif op == "contains":
                query = query.filter(json_field.ilike(f"%{val}%"))
            elif op == "not_contains":
                query = query.filter(~json_field.ilike(f"%{val}%"))
            else:
                # Numeric operations require casting. 
                # For safety, we try to cast as Float if it's numeric logic
                try:
                    num_val = float(val)
                    num_field = cast(DatasetRecord.values[field].as_string(), Float)
                    if op == "gt":
                        query = query.filter(num_field > num_val)
                    elif op == "gte":
                        query = query.filter(num_field >= num_val)
                    elif op == "lt":
                        query = query.filter(num_field < num_val)
                    elif op == "lte":
                        query = query.filter(num_field <= num_val)
                except ValueError:
                    # If we can't cast to float, fallback to string comparison
                    if op == "gt":
                        query = query.filter(json_field > str(val))
                    elif op == "gte":
                        query = query.filter(json_field >= str(val))
                    elif op == "lt":
                        query = query.filter(json_field < str(val))
                    elif op == "lte":
                        query = query.filter(json_field <= str(val))
                        
        records = query.limit(100).all()
        return {
            "type": "FILTER_RESULTS",
            "count": len(records),
            "filters_applied": [f.dict() for f in intent_result.filters],
            "data": [{
                "id": r.id,
                "values": r.values,
                "status": r.status,
                "duplicate_status": r.duplicate_status,
                "created_at": r.created_at.isoformat()
            } for r in records]
        }
    else:
        # SUMMARIZE, ANALYTICS, ANOMALY
        return {
            "type": "TEXT_RESPONSE",
            "intent": intent_result.intent,
            "response": intent_result.response_text
        }
