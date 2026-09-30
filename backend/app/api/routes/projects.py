from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.ProjectResponse])
def get_projects(db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    if not workspace:
        return []
    projects = db.query(models.Project).filter(models.Project.workspace_id == workspace.id).all()
    return projects

@router.post("/", response_model=schemas.ProjectResponse)
def create_project(project_in: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=400, detail="Workspace not found")
    
    project = models.Project(**project_in.model_dump(), workspace_id=workspace.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/{id}", response_model=schemas.ProjectResponse)
def get_project(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_user)):
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    project = db.query(models.Project).filter(models.Project.id == id, models.Project.workspace_id == workspace.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
