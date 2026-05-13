"""
schemas.py
----------
Pydantic models untuk input/output PanenCerdas ML Service.

Catatan integrasi (feat/integrate-mlservices-v2):
  - Field iklim (ndvi/rainfall_mm/temperature_c/solar_radiation) sekarang
    OPSIONAL. Jika kosong dan lat/lon juga kosong → main.py akan isi default
    Indonesia (lihat data_fetcher.INDONESIA_DEFAULTS).
  - Tambah pest_pressure & variety (sudah didukung model.py internal).
  - Tambah schema pemerintah (dashboard, predictions kecamatan, regions)
    supaya FastAPI bisa melayani frontend /pemerintah/* lewat router terpisah.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional


CropType = Literal["padi", "jagung", "kedelai", "singkong"]
RiskLevel = Literal["low", "medium", "high"]


# ── PREDIKSI INPUT ─────────────────────────────────────
class PredictInput(BaseModel):
    # Mutable agar main.py bisa override nilai iklim + NDVI dari NASA
    model_config = ConfigDict(frozen=False)

    crop_type: CropType = Field(
        ...,
        description="Jenis tanaman.",
        examples=["padi"],
    )
    land_area_ha: float = Field(
        ...,
        gt=0.0,
        description="Luas lahan (hektar).",
        examples=[1.5],
    )

    ndvi: Optional[float] = Field(
        default=None,
        ge=0.0, le=1.0,
        description=(
            "NDVI (0.0-1.0). Opsional. Jika kosong → default 0.6 atau "
            "MODIS APPEEARS bila lat/lon ada."
        ),
        examples=[0.7],
    )
    rainfall_mm: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Curah hujan (mm). Opsional. Di-override NASA POWER bila lat/lon ada.",
        examples=[100.0],
    )
    temperature_c: Optional[float] = Field(
        default=None,
        ge=10.0, le=50.0,
        description="Suhu rata-rata (C). Opsional. Di-override NASA POWER bila lat/lon ada.",
        examples=[27.0],
    )
    solar_radiation: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Radiasi (MJ/m^2/hari). Opsional. Di-override NASA POWER bila lat/lon ada.",
        examples=[200.0],
    )

    pest_pressure: Optional[float] = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description="Tingkat tekanan hama (0.0-1.0). Default 0.0.",
        examples=[0.3],
    )
    variety: Optional[str] = Field(
        default="Lokal",
        description="Nama varietas tanaman. Default 'Lokal'.",
        examples=["Ciherang"],
    )

    lat: Optional[float] = Field(
        default=None,
        ge=-11.0, le=6.0,
        description="Latitude (Indonesia: -11 s/d 6). Jika ada, iklim+NDVI di-fetch real.",
        examples=[-7.25],
    )
    lon: Optional[float] = Field(
        default=None,
        ge=95.0, le=141.0,
        description="Longitude (Indonesia: 95 s/d 141).",
        examples=[112.75],
    )


# ── PREDIKSI OUTPUT ────────────────────────────────────
class PredictOutput(BaseModel):
    # Pydantic v2 protects "model_*" namespace; V2 schema pakai `model_source`
    # jadi kita opt-out di sini.
    model_config = ConfigDict(protected_namespaces=())

    prediction_log_id: Optional[int] = None
    harvest_days: int
    yield_ton_per_ha: float
    total_yield_ton: float
    risk_level: RiskLevel
    risk_score: float = 0.0
    recommendations: list[str]
    model_source: Literal["ml_model", "fallback_rules"]
    confidence: float
    climate_source: Optional[str] = None
    ndvi_source: Optional[str] = None


# ── HEALTH CHECK ───────────────────────────────────────
class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str
    model_loaded: bool
    service: str
    version: str
    feedback_stats: Optional[dict] = None
    cache_stats: Optional[dict] = None


# ── PEMERINTAH: DASHBOARD ──────────────────────────────
class KpiTile(BaseModel):
    label: str
    value: str
    delta: Optional[str] = None
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


# ── PEMERINTAH: PREDIKSI KECAMATAN ─────────────────────
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
