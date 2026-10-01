# DataForge AI

DataForge AI is a revolutionary dataset generation and orchestration platform that leverages Generative AI to automatically deduce schemas, generate execution pipelines, orchestrate scrapers/API collectors, and dynamically build, validate, and deduplicate datasets based entirely on natural language requirements.

## Architecture

DataForge AI is split into a **Frontend (Next.js)** and **Backend (FastAPI)**. 
- **Frontend (Next.js / React)**: Handles authentication, workspace management, interactive conversational querying, dynamic dataset exploration (tables generated based on dynamic AI schema), and visual workflow executions.
- **Backend (FastAPI)**: A high-performance async server running Python.
  - **AI Service**: Maps natural language to deterministic AST configurations using Google's Gemini LLMs.
  - **Task Runner**: A background execution engine handling partial failures, intelligent collection, and dataset creation safely.
  - **Collection Engine**: Pluggable orchestrator supporting HTTP Requests, headless browsers (Playwright), and REST API Pagination. It is strictly secured against SSRF and arbitrary script execution.
- **Database (PostgreSQL / SQLite)**: The database is managed via SQLAlchemy ORM, securing against SQL injections with proper typing, indexes, and relationship setups.
- **Authentication**: JWT-based stateless authentication with password hashing using bcrypt.

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Google Gemini API Key

### Environment Variables
**Backend (`backend/.env`):**
```env
DATABASE_URL=sqlite:///./dataforge.db
# DATABASE_URL=postgresql://user:password@localhost/dataforge  # For production
SECRET_KEY=your_super_secret_key_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GEMINI_API_KEY=your_gemini_api_key_here
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Database Setup
The backend utilizes SQLAlchemy. Upon starting the backend for the first time, it automatically builds all tables and indexes. 

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Unix:
# source venv/bin/activate
pip install -r requirements.txt
```

### Running Backend
In your activated virtual environment:
```bash
uvicorn app.main:app --reload --port 8000
```

### Running Frontend
```bash
cd frontend
npm install
npm run dev
```

### Testing
To run the automated tests, ensure your virtual environment is activated:
```bash
cd backend
pytest tests/
```
The test suite covers:
- Deterministic normalizers (Currency, date, whitespace)
- API endpoint validation
- End-to-end dataset creation
- Authentication pipelines

### Supported Sources
DataForge supports orchestrating these source archetypes out of the box:
1. **HTTP Collector**: Standard headless GET requests for static HTML or JSON endpoints.
2. **API Collector**: Deep integration with pagination support (`max_pages`, `pagination_param`) and token injections for paginated REST endpoints.
3. **Browser Collector**: Leverages Playwright to evaluate complex JavaScript-rendered Single Page Applications (SPAs).

*Note: All sources are guarded by strict Server-Side Request Forgery (SSRF) protections. Internal IP allocations and localhost domains are hard-blocked unless explicitly whitelisted for demo endpoints.*

### Limitations
- **Deduplication Engine Limits**: The current similarity deduplicator operates in-memory. For massive datasets (>100,000 rows), this requires scaling to a distributed pipeline (like Apache Spark) or vector indexing.
- **Browser Concurrency**: Playwright headless evaluation is extremely resource-intensive. Background task execution pools should be capped to prevent CPU saturation in multi-tenant environments.
- **Database Backend**: The default setup relies on SQLite for portability. For heavy concurrency and reliable multi-process background execution, migrate the `DATABASE_URL` to PostgreSQL.
