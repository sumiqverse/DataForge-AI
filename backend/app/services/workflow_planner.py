import json
from sqlalchemy.orm import Session
from app.schemas.workflow import WorkflowPlanRequest, WorkflowPlan, WorkflowStep

def plan_workflow(request: WorkflowPlanRequest, db: Session, current_user) -> WorkflowPlan:
    from app.services.ai_service import genai, settings
    from app import models
    
    workspace = db.query(models.Workspace).filter(models.Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise ValueError("Workspace not found")
        
    valid_sources = db.query(models.Source).filter(
        models.Source.workspace_id == workspace.id,
        models.Source.allowed == True
    ).all()
    valid_source_ids = {s.id for s in valid_sources}
    
    sanitized_sources = []
    for s in request.available_sources:
        if s.get("id") in valid_source_ids:
            sanitized_sources.append(s)
            
    request.available_sources = sanitized_sources
    
    req_fields = [f.get("name", "") for f in request.dataset_schema]
    matched = []
    for src in request.available_sources:
        src_fields = set(src.get("supported_fields", []))
        if any(rf in src_fields for rf in req_fields):
            matched.append(src)
            
    if not matched:
        raise ValueError("No enabled compatible sources are available for this workflow.")
    
    if not hasattr(settings, "GEMINI_API_KEY") or not settings.GEMINI_API_KEY:
        # Fallback if no API key
        steps = []
        steps.append(WorkflowStep(type="source_selection", source_id=matched[0].get("id")))
        steps.append(WorkflowStep(type="collect", source_id=matched[0].get("id")))
        
        steps.extend([
            WorkflowStep(type="extract"),
            WorkflowStep(type="normalize"),
            WorkflowStep(type="validate"),
            WorkflowStep(type="deduplicate"),
            WorkflowStep(type="provenance"),
            WorkflowStep(type="save_dataset")
        ])
        
        return WorkflowPlan(
            name=request.requirement_analysis.get("intent", "Data Collection Workflow"),
            steps=steps
        )
        
    model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
    
    prompt = f"""
    You are a Data Engineering AI. Your task is to plan a structured data collection and processing workflow.
    
    Requirement: {json.dumps(request.requirement_analysis)}
    Dataset Schema: {json.dumps(request.dataset_schema)}
    Available Permitted Sources: {json.dumps(request.available_sources)}
    
    You MUST generate a JSON matching this exact schema:
    {{
        "name": "string (workflow name)",
        "steps": [
            {{
                "type": "string (must be one of: source_selection, collect, extract, normalize, validate, deduplicate, provenance, save_dataset)",
                "source_id": 123 (integer, optional, MUST be a valid ID from the available sources above),
                "config": {{}} (optional configuration object)
            }}
        ]
    }}
    
    Rules:
    1. You MUST only use sources from the Available Permitted Sources list. DO NOT invent source IDs.
    2. The workflow should follow a logical progression (e.g., source_selection -> collect -> extract -> normalize -> validate -> deduplicate -> provenance -> save_dataset).
    3. You may have multiple collect/extract steps if multiple sources are needed.
    """
    
    try:
        res = model.generate_content(prompt)
        plan_data = json.loads(res.text)
        
        # Validate against schema
        plan = WorkflowPlan(**plan_data)
        
        # Security check: ensure all source_ids used in the plan actually exist in the allowed sources
        allowed_source_ids = {s.get("id") for s in request.available_sources if "id" in s}
        for step in plan.steps:
            if step.source_id is not None and step.source_id not in allowed_source_ids:
                raise ValueError(f"AI attempted to use unauthorized or invented source ID: {step.source_id}")
                
        return plan
    except ValueError:
        raise
    except Exception as e:
        print(f"Error planning workflow: {e}")
        # Fallback plan on error
        steps = []
        src_id = matched[0].get("id")
        steps.append(WorkflowStep(type="source_selection", source_id=src_id))
        steps.append(WorkflowStep(type="collect", source_id=src_id))
        
        steps.extend([
            WorkflowStep(type="extract"),
            WorkflowStep(type="normalize"),
            WorkflowStep(type="validate"),
            WorkflowStep(type="deduplicate"),
            WorkflowStep(type="provenance"),
            WorkflowStep(type="save_dataset")
        ])
        
        return WorkflowPlan(
            name=request.requirement_analysis.get("intent", "Data Collection Workflow"),
            steps=steps
        )
