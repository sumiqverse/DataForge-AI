from pydantic import BaseModel, Field
from typing import List, Dict, Any

class DuplicateCluster(BaseModel):
    cluster_id: str
    canonical_record: Dict[str, Any]
    source_references: List[str]
    conflicting_values: Dict[str, List[Any]] = Field(default_factory=dict)
    member_records: List[Dict[str, Any]] = Field(default_factory=list)
    merge_reasons: List[str] = Field(default_factory=list)
