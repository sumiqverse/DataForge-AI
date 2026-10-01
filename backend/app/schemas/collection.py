from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class RawDocument(BaseModel):
    source_id: int
    url: str
    retrieved_at: datetime
    raw_content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
