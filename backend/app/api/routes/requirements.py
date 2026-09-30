from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.services.requirement_engine import analyze_requirement
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

class RequirementRequest(BaseModel):
    prompt: str

@router.post("/analyze")
def analyze_user_requirement(
    req: RequirementRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Analyzes a natural language requirement and returns structured JSON.
    """
    try:
        analysis = analyze_requirement(req.prompt)
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
