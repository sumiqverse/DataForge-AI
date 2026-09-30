from fastapi import APIRouter, Depends, HTTPException
from app.schemas.requirement import RequirementAnalysis
from app.schemas.dataset import DatasetSchema
from app.services.schema_generator import generate_schema
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/generate", response_model=DatasetSchema)
def generate_dataset_schema(
    req: RequirementAnalysis,
    current_user: User = Depends(get_current_user)
):
    """
    Generates a dataset schema from a requirement analysis.
    """
    try:
        schema = generate_schema(req)
        return schema
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
