import os

base_dir = r"c:\Users\sumit\OneDrive\Desktop\ai\backend"
dirs = [
    "app",
    "app/models",
    "app/schemas",
    "app/api",
    "app/services",
    "app/core",
    "tests"
]

for d in dirs:
    os.makedirs(os.path.join(base_dir, d), exist_ok=True)

# requirements.txt
reqs = """fastapi
uvicorn
sqlalchemy
psycopg2-binary
pydantic
pydantic-settings
python-dotenv
pytest
httpx
"""
with open(os.path.join(base_dir, "requirements.txt"), "w") as f:
    f.write(reqs)

# .env
env_content = """DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_db
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
"""
with open(os.path.join(base_dir, ".env"), "w") as f:
    f.write(env_content)

# app/config.py
config_content = """from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    CORS_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

settings = Settings()
"""
with open(os.path.join(base_dir, "app", "config.py"), "w") as f:
    f.write(config_content)

# app/database.py
db_content = """from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"""
with open(os.path.join(base_dir, "app", "database.py"), "w") as f:
    f.write(db_content)

# app/main.py
main_content = """from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db, engine, Base
from app.config import settings

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

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Check DB connection
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = str(e)
        
    return {"status": "ok", "database": db_status}
"""
with open(os.path.join(base_dir, "app", "main.py"), "w") as f:
    f.write(main_content)

for d in dirs:
    if "app" in d or d == "tests":
        init_file = os.path.join(base_dir, d, "__init__.py")
        with open(init_file, "w") as f:
            f.write("")

# tests/test_main.py
test_content = """from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    # If there is no DB, the status might still be 200, but database field will have the error string
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
"""
with open(os.path.join(base_dir, "tests", "test_main.py"), "w") as f:
    f.write(test_content)
