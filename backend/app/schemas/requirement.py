from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class RequirementAnalysis(BaseModel):
    intent: str = Field(description="The core intent, e.g., data_collection, job_search, lead_generation")
    entity: str = Field(description="The primary entity being searched for, e.g., internship, software_company, product")
    description: str = Field(description="A clear, succinct summary of the user's goal")
    filters: Dict[str, Any] = Field(description="Key-value pairs of filters, e.g., {'domain': 'AI/ML', 'location': 'Delhi NCR'}")
    requested_fields: List[str] = Field(description="List of fields the user explicitly requested, e.g., ['company', 'role']")
    location: Optional[str] = Field(None, description="Geographical constraint if explicitly mentioned")
    constraints: List[str] = Field(default_factory=list, description="Any hard constraints mentioned, e.g., 'must be remote', 'deadline before Jan'")
    ambiguity_flags: List[str] = Field(default_factory=list, description="List of questions or uncertainties about the prompt that need clarification")
