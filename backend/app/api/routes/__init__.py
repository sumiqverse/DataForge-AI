from fastapi import APIRouter
from . import auth, projects, ai, sources, workflow

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(sources.router, prefix="/sources", tags=["sources"])
api_router.include_router(workflow.router, prefix="/workflow", tags=["workflow"])
