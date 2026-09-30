from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db, engine, Base
from app.config import settings
from app.api.routes import api_router
from app import models

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Builder API")




origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Check DB connection
        db.execute(text("SELECT 1"))
    except Exception:
        pass # We still return ok for the service itself, or handle properly
        
    return {
      "status": "ok",
      "service": "dataforge-api"
    }
