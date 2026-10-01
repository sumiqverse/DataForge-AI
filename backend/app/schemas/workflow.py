from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class WorkflowStep(BaseModel):
    type: Literal[
        "source_selection", 
        "collect", 
        "extract", 
        "normalize", 
        "validate", 
        "deduplicate", 
        "provenance", 
        "save_dataset"
    ]
    source_id: Optional[int] = None
    config: Optional[dict] = Field(default_factory=dict)

class WorkflowPlan(BaseModel):
    name: str
    steps: List[WorkflowStep]

class WorkflowPlanRequest(BaseModel):
    requirement_analysis: dict
    dataset_schema: list
    available_sources: list
