from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models import User, DatasetRecord
from app.database import get_db

router = APIRouter()

@router.get("/{id}/provenance")
async def get_record_provenance(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Retrieve full provenance trace for a specific dataset record.
    """
    record = db.query(DatasetRecord).filter(DatasetRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset record not found")
        
    return record.provenance

@router.get("/{id}")
async def get_dataset_record(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Retrieve a specific dataset record.
    """
    record = db.query(DatasetRecord).filter(DatasetRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset record not found")
        
    # Build response manually or use model_dump if Pydantic model matches
    return {
        "id": record.id,
        "dataset_id": record.dataset_id,
        "values": record.values,
        "status": record.status,
        "duplicate_status": record.duplicate_status,
        "cluster_id": record.cluster_id,
        "provenance": record.provenance,
        "created_at": record.created_at
    }
