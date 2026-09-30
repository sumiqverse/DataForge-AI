from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.database import get_db

router = APIRouter()

@router.post("", response_model=schemas.WorkspaceResponse)
def create_workspace(
    workspace_in: schemas.WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    workspace = models.Workspace(**workspace_in.model_dump(), owner_id=current_user.id)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace

@router.get("", response_model=List[schemas.WorkspaceResponse])
def get_workspaces(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    return db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).all()

@router.get("/{workspace_id}", response_model=schemas.WorkspaceResponse)
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user),
):
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace
