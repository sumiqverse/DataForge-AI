from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api import deps
from app import models
from app.services.ai_service import parse_prompt, RequirementSchema
from app.database import get_db

router = APIRouter()

class PromptRequest(BaseModel):
    prompt: str
    project_id: int

@router.post("/parse-requirement", response_model=RequirementSchema)
def parse_requirement(
    request: PromptRequest, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_user)
):
    # Optional: Verify project ownership
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    project = db.query(models.Project).filter(
        models.Project.id == request.project_id, 
        models.Project.workspace_id == workspace.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    sources = db.query(models.Source).filter(models.Source.workspace_id == workspace.id, models.Source.allowed == True).all()
    available_sources = [
        {"name": s.name, "type": s.type, "supported_fields": s.supported_fields} 
        for s in sources
    ]

    try:
        parsed_requirement = parse_prompt(request.prompt, available_sources)
        return parsed_requirement
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class EnrichmentRequest(BaseModel):
    prompt: str
    dataset_id: int

@router.post("/enrichment-plan", response_model=RequirementSchema)
def create_enrichment_plan(
    request: EnrichmentRequest, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(deps.get_current_user)
):
    from app.services.ai_service import plan_enrichment
    
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=400, detail="Workspace not found")
        
    dataset = db.query(models.Dataset).filter(models.Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    sources = db.query(models.Source).filter(models.Source.workspace_id == workspace.id, models.Source.allowed == True).all()
    available_sources = [
        {"name": s.name, "type": s.type, "supported_fields": s.supported_fields} 
        for s in sources
    ]

    try:
        schema_def = dataset.schema_definition or {}
        parsed_requirement = plan_enrichment(schema_def, request.prompt, available_sources)
        return parsed_requirement
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
