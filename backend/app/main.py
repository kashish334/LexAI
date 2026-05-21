"""
LexAI - Legal Document RAG Assistant
Production-ready FastAPI backend
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import create_tables
from app.api.routes import auth, contracts, chat, analysis, admin, search

setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    await create_tables()
    yield


app = FastAPI(
    title="LexAI API",
    description="AI-powered Legal Document RAG Assistant",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(contracts.router, prefix="/api/contracts", tags=["Contracts"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0", "service": "LexAI"}