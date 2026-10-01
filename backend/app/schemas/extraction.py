from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

class ExtractedRecord(BaseModel):
    dataset_id: Optional[int] = None
    values: Dict[str, Any]
    source_url: str
    extraction_metadata: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0
