import os
import json
from pydantic import ValidationError
from app.schemas.requirement import RequirementAnalysis
from app.config import settings

def analyze_requirement(prompt: str) -> RequirementAnalysis:
    if not hasattr(settings, "GEMINI_API_KEY") or not settings.GEMINI_API_KEY:
        return RequirementAnalysis(
            intent="data_collection",
            entity="internship",
            description="Mock analysis due to missing API key",
            filters={"domain": "AI/ML", "location": "Delhi NCR"},
            requested_fields=["company", "role", "stipend", "deadline", "application_url"],
            location="Delhi NCR",
            constraints=[],
            ambiguity_flags=["No API key provided, using mock data."]
        )
    
    try:
        from google import genai
        from google.genai import types
        
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        system_instruction = (
            "You are an expert natural language requirement analyzer for a data platform. "
            "Your job is to read user prompts and extract structured requirements."
        )
        
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=RequirementAnalysis,
                temperature=0.0
            ),
        )
        
        data = json.loads(response.text)
        return RequirementAnalysis(**data)
        
    except ImportError:
        import google.generativeai as old_genai
        old_genai.configure(api_key=settings.GEMINI_API_KEY)
        
        model = old_genai.GenerativeModel(
            'gemini-3.5-flash', 
            generation_config={"response_mime_type": "application/json"}
        )
        system_instruction = (
            "You are an expert natural language requirement analyzer for a data platform. "
            "Extract structured requirements exactly matching this JSON schema:\n"
            + (json.dumps(RequirementAnalysis.model_json_schema()) if hasattr(RequirementAnalysis, "model_json_schema") else RequirementAnalysis.schema_json())
        )
        
        full_prompt = f"{system_instruction}\n\nUser Prompt: {prompt}"
        try:
            response = model.generate_content(full_prompt)
        except Exception as e:
            if "404" in str(e):
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
            return RequirementAnalysis(**data)
        except (json.JSONDecodeError, ValidationError) as e:
            raise ValueError(f"Failed to parse LLM response into structured JSON: {e}")
            
    except Exception as e:
        raise RuntimeError(f"Requirement analysis failed: {str(e)}")
