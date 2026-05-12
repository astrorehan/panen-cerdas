"""Trained XGBoost predictor for petani per-lahan yield + harvest days.

Loaded once at import time. If the model files are missing (fresh
clone, no training run yet), `is_available()` returns False and
callers fall back to the rule-based heuristic.

Train via:
    python -m model.train_synthetic
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterable

import joblib
import numpy as np

from ml_service.core.config import DATA_DIR

# Model artifacts — distinct from the kecamatan-level `xgb_padi_jabar.pkl`
# referenced by model/predict.py (that's pemerintah scope; this is petani).
YIELD_MODEL_PATH = DATA_DIR / "models" / "xgb_yield_petani.pkl"
HARVEST_MODEL_PATH = DATA_DIR / "models" / "xgb_harvest_petani.pkl"

CROP_LIST: tuple[str, ...] = ("padi", "jagung", "kedelai", "singkong")

# Mirrors ml_service/api/ml.py::IMPROVED_VARIETIES (kept here so train +
# predict share one source of truth).
IMPROVED_VARIETIES: frozenset[str] = frozenset({
    "IR64", "Ciherang", "Inpari32", "Memberamo",
    "NK7328", "Pioneer36", "Bisi18",
    "Anjasmoro", "Dena1", "Grobogan",
    "UJ3", "Adira1", "Malang6",
})

FEATURE_NAMES: tuple[str, ...] = (
    "is_padi", "is_jagung", "is_kedelai", "is_singkong",
    "is_improved_variety",
    "pest_pressure",
    "ndvi", "rainfall_mm", "temperature_c", "solar_radiation",
)


def build_features(
    crop_type: str,
    variety: str,
    pest_pressure: float,
    ndvi: float,
    rainfall_mm: float,
    temperature_c: float,
    solar_radiation: float,
) -> np.ndarray:
    """Pack inputs into the fixed feature vector used by both XGBoost models."""
    one_hot = [1.0 if crop_type == c else 0.0 for c in CROP_LIST]
    is_improved = 1.0 if variety in IMPROVED_VARIETIES else 0.0
    return np.array(
        [
            *one_hot,
            is_improved,
            float(pest_pressure),
            float(ndvi),
            float(rainfall_mm),
            float(temperature_c),
            float(solar_radiation),
        ],
        dtype=np.float32,
    )


_yield_model = None
_harvest_model = None


def _load_models() -> None:
    global _yield_model, _harvest_model
    if YIELD_MODEL_PATH.exists():
        try:
            _yield_model = joblib.load(YIELD_MODEL_PATH)
        except Exception as exc:
            print(f"[predictor] failed to load yield model: {exc}")
            _yield_model = None
    if HARVEST_MODEL_PATH.exists():
        try:
            _harvest_model = joblib.load(HARVEST_MODEL_PATH)
        except Exception as exc:
            print(f"[predictor] failed to load harvest model: {exc}")
            _harvest_model = None


def is_available() -> bool:
    return _yield_model is not None and _harvest_model is not None


def predict(features: Iterable[float]) -> tuple[float, int]:
    """Return (yield_ton_per_ha, harvest_days). Raises if models unloaded."""
    if not is_available():
        raise RuntimeError("predictor models are not loaded")
    vec = np.asarray(list(features), dtype=np.float32).reshape(1, -1)
    yield_pred = float(_yield_model.predict(vec)[0])  # type: ignore[union-attr]
    days_pred = int(round(float(_harvest_model.predict(vec)[0])))  # type: ignore[union-attr]
    return max(0.0, yield_pred), max(1, days_pred)


_load_models()
