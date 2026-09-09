"""
AgenticMeet AI — FastAPI Backend
Wraps existing Python modules behind a RESTful API.
"""
import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add the python_code directory to sys.path so existing modules can be imported
PYTHON_CODE_DIR = str(Path(__file__).resolve().parent.parent / "python_code")
if PYTHON_CODE_DIR not in sys.path:
    sys.path.insert(0, PYTHON_CODE_DIR)

# Create uploads directory
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

from routers import upload, status, analytics, summary, translate, speakers, export  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    print("🚀 AgenticMeet AI Backend starting...")
    yield
    print("👋 AgenticMeet AI Backend shutting down...")


app = FastAPI(
    title="AgenticMeet AI",
    description="AI-powered meeting assistant — transcription, summarization, analytics & more.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(status.router, prefix="/api", tags=["Status"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(summary.router, prefix="/api", tags=["Summary"])
app.include_router(translate.router, prefix="/api", tags=["Translation"])
app.include_router(speakers.router, prefix="/api", tags=["Speakers"])
app.include_router(export.router, prefix="/api", tags=["Export"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "AgenticMeet AI"}
