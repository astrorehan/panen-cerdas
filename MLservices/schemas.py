"""
schemas.py
----------
Pydantic models untuk input/output PanenCerdas ML Service.

Perubahan dari v2.1:
  - PredictOutput: tambah field ndvi_source
    (sumber NDVI: modis_appeears / seasonal_estimate / user_input)
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional


# ── INPUT ──────────────────────────────────────────────
class PredictInput(BaseModel):
    # Mutable agar main.py bisa override nilai iklim + NDVI dari NASA
    model_config = ConfigDict(frozen=False)

    ndvi: float = Field(
        ...,
        ge=0.0, le=1.0,
        description=(
            "Normalized Difference Vegetation Index (0.0–1.0). "
            "Jika lat/lon tersedia, nilai ini di-override dari MODIS APPEEARS."
        ),
        examples=[0.7],
    )
    rainfall_mm: float = Field(
        ...,
        ge=0.0,
        description="Curah hujan (mm). Di-override oleh NASA POWER jika lat/lon ada.",
        examples=[100.0],
    )
    temperature_c: float = Field(
        ...,
        ge=10.0, le=50.0,
        description="Suhu rata-rata (°C). Di-override oleh NASA POWER jika lat/lon ada.",
        examples=[27.0],
    )
    solar_radiation: float = Field(
        ...,
        ge=0.0,
        description="Radiasi matahari (MJ/m²/hari). Di-override oleh NASA POWER jika lat/lon ada.",
        examples=[200.0],
    )
    land_area_ha: float = Field(
        ...,
        gt=0.0,
        description="Luas lahan (hektar).",
        examples=[1.5],
    )
    crop_type: Literal["padi", "jagung", "kedelai", "singkong"] = Field(
        ...,
        description="Jenis tanaman.",
        examples=["padi"],
    )

    # Opsional — jika dikirim, data iklim + NDVI diambil dari sumber real
    lat: Optional[float] = Field(
        default=None,
        ge=-11.0, le=6.0,
        description=(
            "Latitude lahan (Indonesia: -11 s/d 6). Opsional. "
            "Jika ada, data iklim diambil dari NASA POWER dan NDVI dari MODIS APPEEARS."
        ),
        examples=[-7.25],
    )
    lon: Optional[float] = Field(
        default=None,
        ge=95.0, le=141.0,
        description="Longitude lahan (Indonesia: 95 s/d 141). Opsional.",
        examples=[112.75],
    )


# ── OUTPUT ─────────────────────────────────────────────
class PredictOutput(BaseModel):
    prediction_log_id: Optional[int] = Field(
        default=None,
        description="ID log prediksi ini. Simpan untuk lapor hasil panen via POST /feedback.",
    )
    harvest_days: int = Field(
        ...,
        description="Estimasi hari hingga panen.",
    )
    yield_ton_per_ha: float = Field(
        ...,
        description="Estimasi hasil panen per hektar (ton).",
    )
    total_yield_ton: float = Field(
        ...,
        description="Total estimasi hasil panen (ton).",
    )
    risk_level: Literal["low", "medium", "high"] = Field(
        ...,
        description="Tingkat risiko gagal panen.",
    )
    risk_score: float = Field(
        ...,
        description="Skor risiko (0.0–1.0).",
    )
    recommendations: list[str] = Field(
        ...,
        description="Rekomendasi tindakan untuk petani.",
    )
    model_source: Literal["ml_model", "fallback_rules"] = Field(
        ...,
        description="Sumber prediksi: model ML atau rule-based fallback.",
    )
    confidence: float = Field(
        ...,
        description="Tingkat kepercayaan prediksi (0.0–1.0).",
    )
    climate_source: Optional[str] = Field(
        default=None,
        description=(
            "Sumber data iklim: "
            "nasa_power (real) / default_fallback (API gagal) / user_input (lat/lon tidak diisi)."
        ),
    )
    ndvi_source: Optional[str] = Field(
        default=None,
        description=(
            "Sumber data NDVI: "
            "modis_appeears (real MODIS) / seasonal_estimate (estimasi musiman) / user_input (lat/lon tidak diisi)."
        ),
    )


# ── HEALTH CHECK ───────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    service: str
    version: str
    feedback_stats: Optional[dict] = None
    cache_stats: Optional[dict] = None
