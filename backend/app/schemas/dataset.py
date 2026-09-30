from pydantic import BaseModel, Field, validator
from typing import List, Literal, Optional

FieldType = Literal["text", "number", "currency", "date", "url", "boolean"]

class DatasetField(BaseModel):
    name: str = Field(description="Internal machine-readable name (snake_case)")
    display_name: str = Field(description="Human-readable name")
    type: FieldType = Field(description="Data type of the field")
    required: bool = Field(default=False, description="Whether the field is mandatory")
    description: str = Field(description="Brief explanation of what the field contains")
    normalization_rule: Optional[str] = Field(None, description="Rule to standardize the value, e.g., 'Normalize to INR/month'")
    validation_rule: Optional[str] = Field(None, description="Rule to validate the value, e.g., 'Must be >= 0'")

class DatasetSchema(BaseModel):
    fields: List[DatasetField]

    @validator("fields")
    def check_duplicate_names(cls, v):
        names = [f.name for f in v]
        if len(names) != len(set(names)):
            raise ValueError("Duplicate field names found in schema")
        return v
