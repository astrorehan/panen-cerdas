"""ML endpoints — POST /predict + POST /feedback.

Phase 1: mock heuristic (rule-based), shape-correct response.
Phase 7: XGBoost + NASA POWER wired in.
  - Climate: NASA POWER 30-day average when (lat, lon) supplied; falls
    back to hardcoded tropical defaults on network failure.
  - Yield + harvest_days: trained XGBoost models (`data/models/xgb_*.pkl`)
    if loaded; otherwise the rule-based formula remains as fallback.
  - NDVI: still mock — real GEE Sentinel-2 integration deferred (auth +
    quota overhead too high for the hackathon).
Recommendations + risk_level + confidence stay rule-based.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

from ml_service import climate, predictor
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


def _heuristic_yield_formula(
    crop_type: str, variety: str, pest_pressure: float,
    ndvi: float, rainfall: float, temperature: float, solar: float,
) -> float:
    base_yield = BASE_YIELD[crop_type]
    ndvi_factor = max(0.5, min(1.3, ndvi / 0.7))
    pest_factor = 1.0 - pest_pressure * 0.5
    rainfall_factor = max(0.6, 1.0 - abs(rainfall - 150.0) / 300.0)
    temp_factor = max(0.7, 1.0 - abs(temperature - 27.0) / 30.0)
    solar_factor = max(0.8, min(1.1, solar / 200.0))
    variety_factor = 1.05 if variety in IMPROVED_VARIETIES else 1.0
    return base_yield * ndvi_factor * pest_factor * rainfall_factor * temp_factor * solar_factor * variety_factor


def _heuristic_predict(req: PredictRequest) -> tuple[dict, str, str]:
    """Resolve features, score, and explain. Returns (numeric_dict, climate_source, ndvi_source)."""
    # ----- Climate resolution -----
    if req.rainfall_mm is not None and req.temperature_c is not None:
        climate_source = "manual"
        rainfall = req.rainfall_mm
        temperature = req.temperature_c
        solar = req.solar_radiation if req.solar_radiation is not None else 200.0
    elif req.lat is not None and req.lon is not None:
        fetched = climate.fetch_climate(req.lat, req.lon)
        if fetched is not None:
            climate_source = "estimated"
            rainfall = fetched["rainfall_mm"]
            temperature = fetched["temperature_c"]
            solar = fetched["solar_radiation"]
        else:
            # NASA POWER failed (offline, parse error) - mark default
            climate_source = "default"
            rainfall = 180.0
            temperature = 27.5
            solar = 210.0
    else:
        climate_source = "default"
        rainfall = 150.0
        temperature = 27.0
        solar = 200.0

    # ----- NDVI resolution -----
    if req.ndvi is not None:
        ndvi_source = "manual"
        ndvi = req.ndvi
    elif req.lat is not None and req.lon is not None:
        # Phase 7: GEE Sentinel-2 deferred; still mock 0.65 from "estimated".
        ndvi_source = "estimated"
        ndvi = 0.65
    else:
        ndvi_source = "default"
        ndvi = 0.6

    # ----- Score: XGBoost if available, else heuristic formula -----
    base_yield = BASE_YIELD[req.crop_type]
    base_days = BASE_HARVEST_DAYS[req.crop_type]

    if predictor.is_available():
        feats = predictor.build_features(
            crop_type=req.crop_type,
            variety=req.variety,
            pest_pressure=req.pest_pressure,
            ndvi=ndvi,
            rainfall_mm=rainfall,
            temperature_c=temperature,
            solar_radiation=solar,
        )
        yield_per_ha, harvest_days = predictor.predict(feats)
        yield_per_ha = round(yield_per_ha, 2)
    else:
        yield_per_ha = round(
            _heuristic_yield_formula(
                req.crop_type, req.variety, req.pest_pressure,
                ndvi, rainfall, temperature, solar,
            ),
            2,
        )
        harvest_days = int(base_days + req.pest_pressure * 10 - (ndvi - 0.6) * 15)

    total_yield = round(yield_per_ha * req.land_area_ha, 2)

    # ----- Confidence (rule-based) -----
    explicit_count = sum(
        1
        for v in (req.ndvi, req.rainfall_mm, req.temperature_c, req.solar_radiation, req.lat, req.lon)
        if v is not None
    )
    confidence = round(min(0.92, 0.55 + 0.06 * explicit_count), 2)
    if predictor.is_available():
        confidence = round(min(0.95, confidence + 0.03), 2)  # small bump for trained model

    # ----- Risk level (rule-based, derived from yield ratio + pest) -----
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
