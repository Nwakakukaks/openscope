"""OpenScope Backend API."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import api, templates, github, ai, pipelines
from .config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("Starting OpenScope Backend...")

    # Ensure templates directory exists
    templates_dir = Path(__file__).parent / "templates"
    templates_dir.mkdir(exist_ok=True)

    yield

    # Shutdown
    print("Shutting down OpenScope Backend...")


app = FastAPI(
    title="OpenScope API",
    description="Visual plugin builder for Daydream Scope",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api.router, prefix="/api")
app.include_router(templates.router, prefix="/api/templates")
app.include_router(github.router, prefix="/api/github")
app.include_router(ai.router, prefix="/api/ai")
app.include_router(pipelines.router, prefix="/api/scope")

# Serve static files from frontend build
frontend_build = Path(__file__).parent.parent / "frontend" / "out"
if frontend_build.exists():
    app.mount("/", StaticFiles(directory=str(frontend_build), html=True), name="static")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}
