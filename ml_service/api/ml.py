"""ML endpoints — POST /predict + POST /feedback.

Phase 1: mock heuristic (rule-based), shape-correct response.
Phase 7: replace _heuristic_predict() with XGBoost + NASA POWER + GEE NDVI.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

from ml_service.core.config import DATA_DIR
from ml_service.schemas import (
    FeedbackRequest,
    FeedbackResponse,
    PredictRequest,
    PredictResponse,
)

router = APIRouter()

PREDICTIONS_LOG = DATA_DIR / "predictions.jsonl"
FEEDBACK_LOG = DATA_DIR / "feedback.jsonl"

BASE_YIELD: dict[str, float] = {"padi": 5.0, "jagung": 6.0, "kedelai": 2.5, "singkong": 20.0}
BASE_HARVEST_DAYS: dict[str, int] = {"padi": 105, "jagung": 100, "kedelai": 85, "singkong": 240}
IMPROVED_VARIETIES: set[str] = {
    "IR64", "Ciherang", "Inpari32", "Memberamo",
    "NK7328", "Pioneer36", "Bisi18",
    "Anjasmoro", "Dena1", "Grobogan",
    "UJ3", "Adira1", "Malang6",
}


def _next_id(path: Path) -> int:
    if not path.exists():
        return 1
    return sum(1 for _ in path.open("r", encoding="utf-8")) + 1


def _append_jsonl(path: Path, record: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def _heuristic_predict(req: PredictRequest) -> tuple[dict, str, str]:
    """Rule-based mock. Returns (numeric_dict, climate_source, ndvi_source)."""
    # Climate provenance
    if req.rainfall_mm is not None and req.temperature_c is not None:
        climate_source = "manual"
        rainfall = req.rainfall_mm
        temperature = req.temperature_c
        solar = req.solar_radiation if req.solar_radiation is not None else 200.0
    elif req.lat is not None and req.lon is not None:
        climate_source = "estimated"
        # Mock NASA POWER fetch: tropics defaults
        rainfall = 180.0
        temperature = 27.5
        solar = 210.0
    else:
        climate_source = "default"
        rainfall = 150.0
        temperature = 27.0
        solar = 200.0

    # NDVI provenance
    if req.ndvi is not None:
        ndvi_source = "manual"
        ndvi = req.ndvi
    elif req.lat is not None and req.lon is not None:
        ndvi_source = "estimated"
        ndvi = 0.65
    else:
        ndvi_source = "default"
        ndvi = 0.6

    base_yield = BASE_YIELD[req.crop_type]
    base_days = BASE_HARVEST_DAYS[req.crop_type]

    ndvi_factor = max(0.5, min(1.3, ndvi / 0.7))
    pest_factor = 1.0 - req.pest_pressure * 0.5
    # rainfall bell: optimal 150mm
    rainfall_factor = max(0.6, 1.0 - abs(rainfall - 150.0) / 300.0)
    temp_factor = max(0.7, 1.0 - abs(temperature - 27.0) / 30.0)
    solar_factor = max(0.8, min(1.1, solar / 200.0))
    variety_factor = 1.05 if req.variety in IMPROVED_VARIETIES else 1.0

    yield_per_ha = round(
        base_yield * ndvi_factor * pest_factor * rainfall_factor * temp_factor * solar_factor * variety_factor,
        2,
    )
    total_yield = round(yield_per_ha * req.land_area_ha, 2)

    # Harvest days: slight stretch with pest, slight shorten with high NDVI
    harvest_days = int(base_days + req.pest_pressure * 10 - (ndvi - 0.6) * 15)

    # Confidence: more inputs explicitly provided = higher confidence
    explicit_count = sum(
        1
        for v in (req.ndvi, req.rainfall_mm, req.temperature_c, req.solar_radiation, req.lat, req.lon)
        if v is not None
    )
    confidence = round(min(0.92, 0.55 + 0.06 * explicit_count), 2)

    # Risk level: combine pest + yield delta from base
    yield_ratio = yield_per_ha / base_yield
    if req.pest_pressure >= 0.7 or yield_ratio < 0.7:
        risk_level: str = "high"
    elif req.pest_pressure >= 0.4 or yield_ratio < 0.85:
        risk_level = "medium"
    else:
        risk_level = "low"

    recommendations: list[str] = []
    if req.pest_pressure >= 0.6:
        recommendations.append("Lakukan penyemprotan pestisida — tingkat hama tinggi.")
    elif req.pest_pressure >= 0.3:
        recommendations.append("Pantau hama mingguan dan siapkan pestisida cadangan.")
    if ndvi < 0.5:
        recommendations.append("NDVI rendah — periksa kesehatan tanaman dan pemupukan.")
    if rainfall < 100:
        recommendations.append("Curah hujan rendah — pertimbangkan irigasi tambahan.")
    elif rainfall > 250:
        recommendations.append("Curah hujan tinggi — pastikan drainase lahan baik.")
    if req.variety not in IMPROVED_VARIETIES and req.variety.lower() != "lokal":
        recommendations.append(f"Varietas '{req.variety}' belum dikenal — verifikasi penanaman.")
    if not recommendations:
        recommendations.append("Kondisi mendukung — pertahankan praktik tani saat ini.")

    return (
        {
            "harvest_days": harvest_days,
            "yield_ton_per_ha": yield_per_ha,
            "total_yield_ton": total_yield,
            "risk_level": risk_level,
            "confidence": confidence,
            "recommendations": recommendations,
        },
        climate_source,
        ndvi_source,
    )


@router.post("/predict", response_model=PredictResponse, tags=["ml"])
def predict(req: PredictRequest) -> PredictResponse:
    result, climate_source, ndvi_source = _heuristic_predict(req)
    prediction_log_id = _next_id(PREDICTIONS_LOG)

    record = {
        "id": prediction_log_id,
        "request": req.model_dump(),
        "response": {**result, "climate_source": climate_source, "ndvi_source": ndvi_source},
    }
    _append_jsonl(PREDICTIONS_LOG, record)

    return PredictResponse(
        prediction_log_id=prediction_log_id,
        climate_source=climate_source,  # type: ignore[arg-type]
        ndvi_source=ndvi_source,  # type: ignore[arg-type]
        **result,
    )


@router.post("/feedback", response_model=FeedbackResponse, tags=["ml"])
def feedback(req: FeedbackRequest) -> FeedbackResponse:
    feedback_id = _next_id(FEEDBACK_LOG)
    _append_jsonl(FEEDBACK_LOG, {"id": feedback_id, **req.model_dump()})
    return FeedbackResponse(status="received", feedback_id=feedback_id)
