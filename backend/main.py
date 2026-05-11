"""FastAPI entry point.

Run (dev):
    uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import dashboard, predictions, regions
from backend.core.config import settings

app = FastAPI(
    title="PanenCerdas API",
    description="Backend untuk prediksi hasil panen + surplus/defisit per kecamatan.",
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


@app.get("/", tags=["health"])
def root() -> dict:
    return {
        "service": "PanenCerdas API",
        "version": "0.1.0",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "healthy"}
