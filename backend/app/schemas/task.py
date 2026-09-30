from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime

class TaskBase(BaseModel):
    status: str
    steps: List[Dict[str, Any]]
    logs: List[str]
    results: Dict[str, Any]

class TaskResponse(TaskBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
