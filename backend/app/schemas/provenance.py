from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class FieldProvenance(BaseModel):
    value: Any
    source: str
    confidence: float
    retrieved_at: datetime

class RecordProvenance(BaseModel):
    source_id: str
    source_url: str
    retrieved_at: datetime
    extraction_timestamp: datetime
    transformation_history: List[str] = []
    field_provenance: Dict[str, FieldProvenance] = Field(default_factory=dict)
    validation_status: str
    
class DatasetRecordWithProvenance(BaseModel):
    id: str
    dataset_id: Optional[int]
    values: Dict[str, Any]
    provenance: RecordProvenance
