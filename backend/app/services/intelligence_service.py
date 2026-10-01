import json
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict, Literal
from google import genai
from google.genai import types
from app.config import settings

def get_client():
    if not hasattr(settings, "GEMINI_API_KEY") or not settings.GEMINI_API_KEY:
        raise ValueError("AI_PROVIDER_NOT_CONFIGURED: AI provider API key is not configured.")
    return genai.Client(api_key=settings.GEMINI_API_KEY)

class FilterCondition(BaseModel):
    field: str = Field(description="The exact schema field name")
    operator: Literal["eq", "neq", "gt", "lt", "gte", "lte", "contains", "not_contains"] = Field(description="The operator to apply")
    value: Any = Field(description="The value to compare against. Must be correctly typed (e.g., number for gt/lt).")

class IntelligenceIntent(BaseModel):
    intent: Literal["FILTER", "SUMMARIZE", "ANALYTICS", "ANOMALY"] = Field(description="The deduced intent of the user's query")
    filters: Optional[List[FilterCondition]] = Field(description="Only populated if intent is FILTER. Structured AST of conditions.")
    response_text: Optional[str] = Field(description="Direct text response for non-filter intents, if applicable.")

def classify_and_execute_intelligence(prompt: str, dataset_schema: dict, dataset_records_sample: List[dict] = []) -> IntelligenceIntent:
    client = get_client()
    
    system_instruction = """
    You are an advanced Natural Language Dataset Intelligence agent.
    Given a dataset schema and a user query, you must classify the query into one of these intents:
    - FILTER: The user wants to see specific rows (e.g., "Show internships paying more than 25k"). You MUST populate the `filters` array using ONLY the allowed operators: eq, neq, gt, lt, gte, lte, contains, not_contains.
    - SUMMARIZE: The user wants a general summary of the dataset. Provide your summary in `response_text`.
    - ANALYTICS: The user wants a specific metric or insight (e.g., "How many are remote?"). Provide your answer in `response_text`.
    - ANOMALY: The user wants to find anomalies or outliers. Describe anomalies you spot in the provided sample in `response_text`.
    
    CRITICAL: Never execute arbitrary SQL. Only map to the structured AST if FILTER.
    """
    
    schema_str = json.dumps(dataset_schema, indent=2)
    sample_str = json.dumps(dataset_records_sample[:50], indent=2) # Send up to 50 records as context
    
    full_prompt = f"{system_instruction}\n\nDataset Schema:\n{schema_str}\n\nSample Data Context:\n{sample_str}\n\nUser Query:\n{prompt}"
    
    try:
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=full_prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        data = json.loads(response.text)
        return IntelligenceIntent(**data)
    except Exception as e:
        print("Intelligence error:", str(e))
        raise ValueError("Failed to process natural language intelligence query.")
