from pydantic import BaseModel
from typing import List, Literal, Optional

class ValidationError(BaseModel):
    field: str
    code: str
    message: Optional[str] = None

class ValidationResult(BaseModel):
    status: Literal["VALID", "NEEDS_REVIEW"]
    errors: List[ValidationError] = []
