import os
import json
from pydantic import ValidationError
from app.schemas.requirement import RequirementAnalysis
from app.config import settings

def analyze_requirement(prompt: str) -> RequirementAnalysis:
    if not hasattr(settings, "GEMINI_API_KEY") or not settings.GEMINI_API_KEY:
        raise ValueError("AI_PROVIDER_NOT_CONFIGURED: AI provider API key is not configured.")
    
    try:
        from google import genai
        from google.genai import types
        
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        system_instruction = (
            "You are an expert natural language requirement analyzer for a data platform. "
            "Your job is to read user prompts and extract structured requirements. "
            "You MUST return a JSON object exactly matching this schema:\n"
            + (json.dumps(RequirementAnalysis.model_json_schema()) if hasattr(RequirementAnalysis, "model_json_schema") else RequirementAnalysis.schema_json())
        )
        
        models_to_try = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash-lite', 'gemini-3.5-flash-lite']
        response = None
        last_err = None
        
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        temperature=0.0
                    ),
                )
                break
            except Exception as e:
                last_err = e
                if "503" in str(e) or "429" in str(e) or "404" in str(e):
                    continue
                raise e
                
        if not response:
            raise last_err
        
        data = json.loads(response.text)
        return RequirementAnalysis(**data)
        
    except ImportError:
        import google.generativeai as old_genai
        old_genai.configure(api_key=settings.GEMINI_API_KEY)
        
        model = old_genai.GenerativeModel(
            'gemini-3.8-flash', 
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
            if "404" in str(e) or "429" in str(e):
                model = old_genai.GenerativeModel('gemini-3.8-flash-lite')
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
