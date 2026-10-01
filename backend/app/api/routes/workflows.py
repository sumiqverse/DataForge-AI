from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.database import get_db
from app.services.workflow_planner import plan_workflow

router = APIRouter()

@router.post("/plan", response_model=schemas.WorkflowPlan)
async def create_workflow_plan(
    request: schemas.WorkflowPlanRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Generate a structured workflow plan based on requirements, schema, and available sources.
    """
    try:
        plan = plan_workflow(request, db, current_user)
        return plan
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate workflow plan: {str(e)}")

@router.get("/{id}", response_model=schemas.WorkflowPlan)
async def get_workflow_plan(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Get a previously generated workflow plan (mocked for now).
    """
    raise HTTPException(status_code=404, detail="Workflow plan persistence not yet implemented")

@router.post("/execute")
async def execute_workflow_plan(
    plan: schemas.WorkflowPlan,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Phase 7: Execution Engine.
    Orchestrates the data collection based on the generated workflow plan.
    """
    from app.services.collector_service import CollectionEngine
    
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=400, detail="Workspace not found")
        
    results = {
        "status": "success",
        "workflow_name": plan.name,
        "steps_executed": [],
        "data_collected": []
    }
    
    try:
        for step in plan.steps:
            results["steps_executed"].append(step.type)
            if step.type == "collect" and step.source_id:
                source = db.query(models.Source).filter(
                    models.Source.id == step.source_id, 
                    models.Source.workspace_id == workspace.id
                ).first()
                
                if not source:
                    continue
                    
                config = source.configuration or {}
                
                if not config.get("url") and not config.get("endpoint"):
                    raise ValueError(f"Source {source.name} is missing endpoint configuration.")
                    
                c_type = "api" if source.type not in ["http", "browser"] else source.type
                collector = CollectionEngine.get_collector(c_type, source.id, config)
                
                docs = await collector.collect()
                for doc in docs:
                    results["data_collected"].append({
                        "source_id": doc.source_id,
                        "url": doc.url,
                        "content_preview": doc.raw_content[:500], # Truncated for UI safety
                        "metadata": doc.metadata
                    })
                    
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")

