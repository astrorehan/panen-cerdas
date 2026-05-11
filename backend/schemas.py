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
