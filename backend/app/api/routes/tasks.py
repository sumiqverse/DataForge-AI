from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Any, Optional
from app.api import deps
from app.models import Task, User, Workspace, Project
from app.schemas.task import TaskResponse
from app.schemas.workflow import WorkflowPlan
from app.services.task_runner import TaskRunner
from app.database import get_db

router = APIRouter()

from pydantic import BaseModel

class TaskCreateRequest(BaseModel):
    plan: WorkflowPlan
    context: dict = {}
    is_enrichment: bool = False
    dataset_id: Optional[int] = None

@router.post("/", response_model=TaskResponse)
async def create_task(
    request: TaskCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Start a new workflow execution task.
    """
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        workspace = Workspace(name="My Workspace", owner_id=current_user.id)
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        
    project = db.query(Project).filter(Project.workspace_id == workspace.id).first()
    if not project:
        project = Project(name="Default Project", workspace_id=workspace.id)
        db.add(project)
        db.commit()
        db.refresh(project)

    new_task = Task(
        project_id=project.id,
        status="QUEUED",
        steps=[],
        logs=[],
        results={},
        metadata_snapshot={
            "plan": request.plan.model_dump(),
            "context": request.context
        }
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # Send to background execution
    background_tasks.add_task(
        TaskRunner.run_task, 
        new_task.id, 
        request.plan, 
        workspace.id,
        request.is_enrichment,
        request.dataset_id
    )
    
    return new_task

@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace or not workspace.projects:
        return []
    
    tasks = db.query(Task).filter(Task.project_id == workspace.projects[0].id).order_by(Task.created_at.desc()).all()
    return tasks

@router.get("/{id}", response_model=TaskResponse)
async def get_task(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/{id}/cancel")
async def cancel_task(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.status in ["COMPLETED", "FAILED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="Task already finished")
        
    task.status = "CANCELLED"
    TaskRunner._log(task, db, "Cancellation requested by user.", level="warn")
    db.commit()
    
    return {"message": "Task cancellation requested"}

@router.get("/{id}/logs")
async def get_task_logs(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"logs": task.logs}
