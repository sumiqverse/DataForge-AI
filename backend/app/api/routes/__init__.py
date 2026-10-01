from fastapi import APIRouter
from . import auth, projects, ai, sources, workflow, workspaces, requirements, schemas, workflows, dataset_records, tasks, datasets, exports

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(sources.router, prefix="/sources", tags=["sources"])
api_router.include_router(workflow.router, prefix="/workflow", tags=["workflow"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(requirements.router, prefix="/requirements", tags=["requirements"])
api_router.include_router(schemas.router, prefix="/schemas", tags=["schemas"])
api_router.include_router(dataset_records.router, prefix="/dataset-records", tags=["dataset-records"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(exports.router, prefix="/datasets", tags=["exports"])

from . import dataset_intelligence
api_router.include_router(dataset_intelligence.router, prefix="/datasets", tags=["dataset_intelligence"])
