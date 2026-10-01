import os
import json
import re
import difflib
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from google import genai
from google.genai import types

def get_client():
    if not hasattr(settings, "GEMINI_API_KEY") or not settings.GEMINI_API_KEY:
        raise ValueError("AI_PROVIDER_NOT_CONFIGURED: AI provider API key is not configured.")
    return genai.Client(api_key=settings.GEMINI_API_KEY)

class FieldSchema(BaseModel):
    name: str = Field(description="Name of the field, e.g., company, stipend")
    type: str = Field(description="Data type, e.g., text, currency, date, url, email, number, boolean")
    required: bool = Field(description="Whether the field is required or optional based on the prompt")
    validation: Optional[str] = Field(description="Any specific validation rule, e.g., must be positive, must be a valid URL")
    normalization: Optional[str] = Field(description="How to normalize the data, e.g., convert to uppercase, parse ISO date")

class WorkflowStep(BaseModel):
    type: str = Field(description="The operation type, e.g., collect, normalize, deduplicate, validate, generate_dataset")
    source: Optional[str] = Field(description="The name of the source to collect from. Only applicable if type is 'collect'.")

class WorkflowSchema(BaseModel):
    steps: List[WorkflowStep] = Field(description="Sequential list of steps to execute the data extraction pipeline")

class RequirementSchema(BaseModel):
    intent: str = Field(description="The core intention, e.g., job_search, lead_generation, data_scraping")
    entity: str = Field(description="The primary entity being searched for, e.g., internship, software_company")
    location: Optional[str] = Field(description="Geographical constraint if mentioned, otherwise null")
    domain: Optional[str] = Field(description="Industry or topic domain, e.g., AI/ML, Finance")
    dataset_schema: List[FieldSchema] = Field(description="The detailed dataset schema defining how each extracted field should be stored")
    recommended_sources: List[str] = Field(description="List of source names from the available sources that can satisfy this requirement")
    workflow: WorkflowSchema = Field(description="The executable workflow pipeline required to fulfill the goal")

def parse_prompt(prompt: str, available_sources: List[dict] = []) -> RequirementSchema:
    client = get_client()
    system_instruction = """
    You are an expert data architect and workflow planner. 
    1. Read the natural language query and convert it into a structured JSON requirement exactly matching the schema.
    2. Pick the best sources from 'Available Sources' and list their names in 'recommended_sources'.
    3. Generate an executable workflow pipeline. For each recommended source, add a 'collect' step. After collection steps, add 'normalize', 'validate', 'deduplicate', and 'generate_dataset' steps in a logical sequence.
    """
    
    schema_str = RequirementSchema.schema_json()
    sources_str = json.dumps(available_sources, indent=2)
    full_prompt = f"{system_instruction}\n\nAvailable Sources:\n{sources_str}\n\nSchema:\n{schema_str}\n\nUser Prompt:\n{prompt}"
    
    models_to_try = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash-lite', 'gemini-3.5-flash-lite']
    response = None
    last_err = None
    
    for m in models_to_try:
        try:
            response = client.models.generate_content(
                model=m,
                contents=full_prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            break
        except Exception as e:
            last_err = e
            if "503" in str(e) or "429" in str(e) or "404" in str(e):
                continue
            raise e
            
    if not response:
        raise last_err
    try:
        data = json.loads(response.text)
        return RequirementSchema(**data)
    except Exception as e:
        print(f"Error parsing LLM output: {response.text}")
        raise ValueError("Failed to parse requirement from prompt")

def extract_and_map_fields(raw_text: str, fields: List[str]) -> dict:
    client = get_client()
    system_instruction = """You are an expert data extractor. Extract the most relevant values for each field from the raw text. 
Format the output as a JSON object where the keys are exactly the provided field names.
Instead of a simple string, every field MUST be an object: {"value": "extracted text", "source": "mention the specific URL or document section it was found", "confidence": 0.98}. If a field is not found, set its value to null."""
    full_prompt = f"{system_instruction}\n\nRequired Fields:\n{json.dumps(fields)}\n\nRaw Text:\n{raw_text[:8000]}"
    try:
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=full_prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)
    except Exception as e:
        raise ValueError(f"EXTRACTION_FAILED: {str(e)}")

def normalize_record(record: dict, dataset_schema: List[dict]) -> dict:
    client = get_client()
    system_instruction = """You are an expert data cleaner. I will give you a raw JSON record where each field is an object {"value": "...", "source": "...", "confidence": 0.9}. 
Standardize dates to YYYY-MM-DD, salaries to consistent formats like '30000 INR / month', and clean locations. Update the 'value' property only. Return the identical JSON structure with normalized values."""
    full_prompt = f"{system_instruction}\n\nSchema Rules:\n{json.dumps(dataset_schema)}\n\nRaw Record:\n{json.dumps(record)}"
    try:
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=full_prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)
    except Exception as e:
        raise ValueError(f"AI_PROVIDER_ERROR: {str(e)}")

def validate_record(record: dict, dataset_schema: List[dict]) -> dict:
    is_valid = True
    errors = []
    
    for field_def in dataset_schema:
        name = field_def.get("name")
        req = field_def.get("required", False)
        f_type = field_def.get("type", "text")
        
        field_obj = record.get(name, {})
        val = field_obj.get("value") if isinstance(field_obj, dict) else field_obj
        
        if req and (val is None or str(val).strip() in ["", "N/A", "None", "null"]):
            is_valid = False
            errors.append(f"Missing required field: {name}")
            continue
            
        if val is None or str(val).strip() in ["", "N/A", "None", "null"]:
            continue
            
        val_str = str(val)
        if f_type == "url":
            if not val_str.startswith("http://") and not val_str.startswith("https://"):
                is_valid = False
                errors.append(f"Invalid URL format for {name}")
        elif f_type == "date":
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", val_str):
                is_valid = False
                errors.append(f"Invalid date format (expected YYYY-MM-DD) for {name}")
                
    record["_status"] = "VALID ✓" if is_valid else "NEEDS REVIEW ⚠"
    if not is_valid:
        record["_validation_errors"] = errors
        
    return record

def get_similarity(r1: dict, r2: dict) -> float:
    def extract_val(v):
        return str(v.get("value")) if isinstance(v, dict) else str(v)
    s1 = " ".join([extract_val(v) for k, v in r1.items() if not k.startswith("_") and v is not None])
    s2 = " ".join([extract_val(v) for k, v in r2.items() if not k.startswith("_") and v is not None])
    return difflib.SequenceMatcher(None, s1.lower(), s2.lower()).ratio()

def deduplicate_records(records: list) -> list:
    clusters = []
    for record in records:
        record_source = record.get("_source", "Unknown")
        clean_rec = {k: v for k, v in record.items() if not k.startswith("_")}
        
        found_cluster = False
        for cluster in clusters:
            if get_similarity(clean_rec, cluster["canonical"]) > 0.75:
                cluster["sources"].append(record_source)
                found_cluster = True
                break
                
        if not found_cluster:
            clusters.append({
                "canonical": clean_rec,
                "sources": [record_source],
                "status": record.get("_status"),
                "errors": record.get("_validation_errors")
            })
            
    final_records = []
    for cluster in clusters:
        rec = cluster["canonical"].copy()
        rec["_sources"] = list(set(cluster["sources"]))
        if cluster["status"]:
            rec["_status"] = cluster["status"]
        if cluster["errors"]:
            rec["_validation_errors"] = cluster["errors"]
        final_records.append(rec)
    return final_records


def enrich_record(record: dict) -> dict:
    client = get_client()
    system_instruction = """
    You are an AI Enrichment Engine. You will receive a JSON record with some missing or null fields. 
    Use your knowledge to deduce data for the missing fields based on the existing fields IF AND ONLY IF you are absolutely certain of the facts without needing to search. 
    If you do not know the answer with high confidence, DO NOT invent or fabricate data. Instead, leave the field missing/null or return a status indicating NOT_FOUND.
    Format any filled field as {"value": "...", "source": "AI Enrichment", "confidence": 0.9}. 
    Leave existing fields intact. Return the fully merged JSON object.
    """
    try:
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=f"{system_instruction}\n\nRecord:\n{json.dumps(record)}",
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        enriched = json.loads(response.text)
        enriched["_status"] = "VALID ? (Enriched)"
        return enriched
    except Exception as e:
        raise ValueError(f"AI_PROVIDER_ERROR: {str(e)}")

def plan_enrichment(dataset_schema: dict, prompt: str, available_sources: List[dict] = []) -> RequirementSchema:
    client = get_client()
    system_instruction = """
    You are an expert data workflow planner for an ENRICHMENT task.
    1. Read the user's enrichment request and the provided dataset schema.
    2. Identify WHICH fields from the schema the user wants to enrich/fill. Create a subset schema with just those fields.
    3. Pick the best sources from 'Available Sources' capable of finding these fields.
    4. Generate a workflow pipeline. For each recommended source, add a 'collect' step. Then add 'normalize', 'validate' steps. (No deduplicate/generate_dataset needed for enrichment).
    """
    
    req_schema_str = RequirementSchema.schema_json()
    sources_str = json.dumps(available_sources, indent=2)
    full_prompt = f"{system_instruction}\n\nAvailable Sources:\n{sources_str}\n\nDataset Schema:\n{json.dumps(dataset_schema, indent=2)}\n\nUser Request:\n{prompt}\n\nOutput JSON matching RequirementSchema:"
    
    response = client.models.generate_content(
        model='gemini-3.8-flash',
        contents=full_prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json")
    )
    try:
        data = json.loads(response.text)
        return RequirementSchema(**data)
    except Exception as e:
        raise ValueError("Failed to parse enrichment requirement")
