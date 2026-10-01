from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.database import get_db
from app.services.source_matcher import match_sources, normalize_fields

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

    # Normalize supported_fields: split any space/comma-separated strings into individual entries
    source_data = source_in.model_dump()
    source_data["supported_fields"] = sorted(normalize_fields(source_data.get("supported_fields") or []))

    source = models.Source(**source_data, workspace_id=workspace.id)
    db.add(source)
    db.commit()
    db.refresh(source)
    return source

@router.put("/{source_id}", response_model=schemas.SourceResponse)
def update_source(source_id: int, source_in: schemas.SourceUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=400, detail="Workspace not found")
        
    source = db.query(models.Source).filter(models.Source.id == source_id, models.Source.workspace_id == workspace.id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
        
    update_data = source_in.model_dump(exclude_unset=True)
    if "supported_fields" in update_data and update_data["supported_fields"] is not None:
        update_data["supported_fields"] = sorted(normalize_fields(update_data["supported_fields"]))
    for field, value in update_data.items():
        setattr(source, field, value)
        
    db.commit()
    db.refresh(source)
    return source

@router.delete("/{source_id}")
def delete_source(source_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=400, detail="Workspace not found")
        
    source = db.query(models.Source).filter(models.Source.id == source_id, models.Source.workspace_id == workspace.id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
        
    db.delete(source)
    db.commit()
    return {"message": "Source deleted successfully"}

@router.post("/match", response_model=List[schemas.SourceMatchResponse])
def match_sources_endpoint(request: schemas.SourceMatchRequest, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=400, detail="Workspace not found")
        
    sources = db.query(models.Source).filter(models.Source.workspace_id == workspace.id).all()
    
    matched_sources = match_sources(request.fields, sources)
    return matched_sources
