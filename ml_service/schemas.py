"""Pydantic schemas — request/response contracts for the API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class KpiTile(BaseModel):
    label: str
    value: str
    delta: str | None = None
    positive: bool = True


class DashboardSummary(BaseModel):
    province: str
    season: str
    tiles: list[KpiTile]


class YieldPoint(BaseModel):
    year: int
    value: float
    kind: Literal["aktual", "prediksi"]


class YieldTrend(BaseModel):
    province: str
    commodity: str
    unit: str = "juta ton"
    points: list[YieldPoint]


class KecamatanPrediction(BaseModel):
    id: str
    kabupaten: str
    kecamatan: str
    yield_pred_ton_per_ha: float
    luas_panen_ha: float
    produksi_pred_ton: float
    surplus_pct: float
    status: Literal["surplus", "cukup", "waspada", "defisit"]


class PredictionsResponse(BaseModel):
    province: str
    commodity: str
    season: str
    items: list[KecamatanPrediction]


class NdviPoint(BaseModel):
    date: str
    ndvi: float


class KecamatanDetail(BaseModel):
    kecamatan: str
    kabupaten: str
    yield_pred_ton_per_ha: float
    luas_panen_ha: float
    total_produksi_ton: float
    ndvi_series: list[NdviPoint]
    backtest: list[YieldPoint]


class RegionsResponse(BaseModel):
    province: str
    items: list[dict] = Field(..., description="GeoJSON FeatureCollection-ish summary")


CropType = Literal["padi", "jagung", "kedelai", "singkong"]
RiskLevel = Literal["low", "medium", "high"]


class PredictRequest(BaseModel):
    crop_type: CropType
    land_area_ha: float = Field(..., gt=0)
    pest_pressure: float = Field(0.0, ge=0.0, le=1.0)
    variety: str = "Lokal"

    lat: float | None = None
    lon: float | None = None

    ndvi: float | None = Field(None, ge=0.0, le=1.0)
    rainfall_mm: float | None = Field(None, ge=0.0)
    temperature_c: float | None = None
    solar_radiation: float | None = Field(None, ge=0.0)


class PredictResponse(BaseModel):
    prediction_log_id: int
    harvest_days: int
    yield_ton_per_ha: float
    total_yield_ton: float
    risk_level: RiskLevel
    confidence: float = Field(..., ge=0.0, le=1.0)
    recommendations: list[str]
    climate_source: Literal["manual", "estimated", "default"]
    ndvi_source: Literal["manual", "estimated", "default"]


class FeedbackRequest(BaseModel):
    prediction_log_id: int
    actual_harvest_days: int = Field(..., gt=0)
    actual_yield_ton_per_ha: float = Field(..., gt=0)
    notes: str | None = None


class FeedbackResponse(BaseModel):
    status: Literal["received"]
    feedback_id: int
