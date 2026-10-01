from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class SourceBase(BaseModel):
    name: str
    type: str
    base_url: Optional[str] = None
    description: Optional[str] = None
    allowed: bool = True
    supported_fields: List[str] = []
    configuration: Dict[str, Any] = {}

class SourceCreate(SourceBase):
    pass

class SourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    base_url: Optional[str] = None
    description: Optional[str] = None
    allowed: Optional[bool] = None
    supported_fields: Optional[List[str]] = None
    configuration: Optional[Dict[str, Any]] = None

class SourceResponse(SourceBase):
    id: int
    workspace_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SourceMatchRequest(BaseModel):
    fields: List[str]

class SourceMatchResponse(BaseModel):
    id: int
    name: str
    type: str
    base_url: Optional[str] = None
    matched_fields: List[str]
    missing_fields: List[str]
