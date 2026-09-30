import json
from pydantic import ValidationError
from app.schemas.requirement import RequirementAnalysis
from app.schemas.dataset import DatasetSchema
from app.config import settings

def generate_schema(requirement: RequirementAnalysis) -> DatasetSchema:
    if not hasattr(settings, "GEMINI_API_KEY") or not settings.GEMINI_API_KEY:
        raise ValueError("API key missing")
        
    system_instruction = (
        "You are an expert data architect. Your task is to take a Requirement Analysis JSON "
        "and generate a Dataset Schema to store the requested data.\n"
        "Rules:\n"
        "- Generate a list of fields.\n"
        "- The 'type' must be one of: text, number, currency, date, url, boolean.\n"
        "- Include 'normalization_rule' and 'validation_rule' where applicable.\n"
        "- Use snake_case for the 'name' field.\n"
        "- Output MUST match the provided JSON schema EXACTLY."
    )
    
    prompt = f"Requirement Analysis:\n{requirement.model_dump_json() if hasattr(requirement, 'model_dump_json') else requirement.json()}"
    
    try:
        from google import genai
        from google.genai import types
        
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=DatasetSchema,
                temperature=0.0
            ),
        )
        data = json.loads(response.text)
        return DatasetSchema(**data)
        
    except ImportError:
        import google.generativeai as old_genai
        old_genai.configure(api_key=settings.GEMINI_API_KEY)
        
        model = old_genai.GenerativeModel(
            'gemini-3.5-flash',
            generation_config={"response_mime_type": "application/json"}
        )
        
        # In Pydantic v2 use model_json_schema, in v1 use schema_json
        schema_def = json.dumps(DatasetSchema.model_json_schema()) if hasattr(DatasetSchema, "model_json_schema") else DatasetSchema.schema_json()
        
        full_prompt = (
            f"{system_instruction}\n"
            f"JSON Schema:\n{schema_def}\n\n"
            f"{prompt}"
        )
        
        try:
            response = model.generate_content(full_prompt)
        except Exception as e:
            if "404" in str(e) or "429" in str(e):
                model = old_genai.GenerativeModel('gemini-3.5-flash-lite')
                response = model.generate_content(full_prompt)
            else:
                raise e
                
        try:
            text = response.text
            if text.startswith("```json"):
                text = text.replace("```json\n", "").replace("```json", "")
            if text.endswith("```"):
                text = text[:-3]
            data = json.loads(text.strip())
            return DatasetSchema(**data)
        except (json.JSONDecodeError, ValidationError) as e:
            raise ValueError(f"Failed to parse LLM response into valid DatasetSchema: {e}")
            
    except Exception as e:
        raise RuntimeError(f"Schema generation failed: {str(e)}")
