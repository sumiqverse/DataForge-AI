from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, asc, desc, cast, String
from typing import List, Optional, Any
from app.api import deps
from app.database import get_db
from app.models import Dataset, DatasetRecord, User, Workspace
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class DatasetResponse(BaseModel):
    id: int
    name: str
    project_id: int
    schema_definition: dict
    created_at: datetime
    
    class Config:
        from_attributes = True

class PaginatedRecordsResponse(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[dict]

@router.get("/", response_model=List[DatasetResponse])
async def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace or not workspace.projects:
        return []
        
    datasets = db.query(Dataset).filter(Dataset.project_id == workspace.projects[0].id).all()
    return datasets

@router.get("/{id}", response_model=DatasetResponse)
async def get_dataset(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.get("/{id}/records", response_model=PaginatedRecordsResponse)
async def get_dataset_records(
    id: int,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    query = db.query(DatasetRecord).filter(DatasetRecord.dataset_id == id)

    # Filtering by Validation Status
    if status_filter:
        query = query.filter(DatasetRecord.status == status_filter)

    # Simple Search across JSON values (basic implementation)
    if search:
        search_term = f"%{search}%"
        # In a real postgres db, we'd use JSONB operators. For SQLite/generic, we can cast to string
        query = query.filter(cast(DatasetRecord.values, String).ilike(search_term))

    # Sorting
    if sort_by:
        # Sort by specific JSON key
        if sort_order == "desc":
            query = query.order_by(desc(DatasetRecord.values[sort_by].as_string()))
        else:
            query = query.order_by(asc(DatasetRecord.values[sort_by].as_string()))
    else:
        query = query.order_by(desc(DatasetRecord.created_at))

    total = query.count()
    records = query.offset((page - 1) * page_size).limit(page_size).all()

    data = []
    for r in records:
        data.append({
            "id": r.id,
            "values": r.values,
            "status": r.status,
            "duplicate_status": r.duplicate_status,
            "cluster_id": r.cluster_id,
            "created_at": r.created_at.isoformat()
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": data
    }
