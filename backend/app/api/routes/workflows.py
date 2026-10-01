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
    Since we aren't saving workflows to DB yet, this endpoint returns a 404 or dummy data.
    """
    raise HTTPException(status_code=404, detail="Workflow plan persistence not yet implemented")

