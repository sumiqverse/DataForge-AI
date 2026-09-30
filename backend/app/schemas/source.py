from pydantic import BaseModel
from typing import List, Optional

class SourceBase(BaseModel):
    name: str
    type: str
    url_or_api: str
    allowed: bool = True
    supported_fields: List[str] = []
    extraction_method: str

class SourceCreate(SourceBase):
    pass

class SourceResponse(SourceBase):
    id: int
    workspace_id: int

    class Config:
        from_attributes = True
