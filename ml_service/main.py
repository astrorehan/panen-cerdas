"""FastAPI ML service entry point.

Run (dev):
    uvicorn ml_service.main:app --reload --port 8000
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ml_service.api import dashboard, ml, predictions, regions
from ml_service.core.config import settings

app = FastAPI(
    title="PanenCerdas ML Service",
    description="ML service for harvest prediction (per-petani) + kecamatan-level aggregates.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
app.include_router(regions.router, prefix="/api/regions", tags=["regions"])
app.include_router(ml.router, tags=["ml"])


@app.get("/", tags=["health"])
def root() -> dict:
    return {
        "service": "PanenCerdas ML Service",
        "version": "0.1.0",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "healthy"}
