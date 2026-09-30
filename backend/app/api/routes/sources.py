from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.SourceResponse])
def get_sources(db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    if not workspace:
        return []
    sources = db.query(models.Source).filter(models.Source.workspace_id == workspace.id).all()
    return sources

@router.post("/", response_model=schemas.SourceResponse)
def create_source(source_in: schemas.SourceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=400, detail="Workspace not found")
    
    source = models.Source(**source_in.model_dump(), workspace_id=workspace.id)
    db.add(source)
    db.commit()
    db.refresh(source)
    return source
