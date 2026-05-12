"""Train XGBoost regressors for per-petani yield + harvest_days.

Phase 7 vibe-code: training labels are generated from the rule-based
heuristic in `ml_service.api.ml._heuristic_predict` plus Gaussian noise.
This gives us a "real" model artifact (`.pkl`) and a functioning
inference path even though the model's accuracy is bounded by the
heuristic. Phase 8 (post-hackathon) replaces this with BPS yield
labels + Sentinel-2 NDVI features.

Run from project root:
    python -m model.train_synthetic
"""
from __future__ import annotations

import time
from pathlib import Path

import joblib
import numpy as np
from xgboost import XGBRegressor

from ml_service.predictor import (
    CROP_LIST,
    FEATURE_NAMES,
    HARVEST_MODEL_PATH,
    IMPROVED_VARIETIES,
    YIELD_MODEL_PATH,
    build_features,
)

# Heuristic constants — kept in sync with ml_service/api/ml.py.
BASE_YIELD = {"padi": 5.0, "jagung": 6.0, "kedelai": 2.5, "singkong": 20.0}
BASE_HARVEST_DAYS = {"padi": 105, "jagung": 100, "kedelai": 85, "singkong": 240}

N_SAMPLES = 5000
SEED = 42
YIELD_NOISE_REL = 0.07      # ~7% multiplicative noise
DAYS_NOISE_ABS = 3.0        # days


def heuristic_yield(
    crop: str, variety: str, pest: float,
    ndvi: float, rain: float, temp: float, solar: float,
) -> float:
    """Mirror of ml_service.api.ml._heuristic_predict yield branch."""
    base = BASE_YIELD[crop]
    ndvi_factor = max(0.5, min(1.3, ndvi / 0.7))
    pest_factor = 1.0 - pest * 0.5
    rain_factor = max(0.6, 1.0 - abs(rain - 150.0) / 300.0)
    temp_factor = max(0.7, 1.0 - abs(temp - 27.0) / 30.0)
    solar_factor = max(0.8, min(1.1, solar / 200.0))
    variety_factor = 1.05 if variety in IMPROVED_VARIETIES else 1.0
    return base * ndvi_factor * pest_factor * rain_factor * temp_factor * solar_factor * variety_factor


def heuristic_days(crop: str, pest: float, ndvi: float) -> float:
    return BASE_HARVEST_DAYS[crop] + pest * 10 - (ndvi - 0.6) * 15


def generate_synthetic(n: int, seed: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    varieties = list(IMPROVED_VARIETIES) + ["Lokal", "Lokal", "Lokal"]  # slightly oversample Lokal

    X = np.empty((n, len(FEATURE_NAMES)), dtype=np.float32)
    y = np.empty(n, dtype=np.float32)
    d = np.empty(n, dtype=np.float32)

    for i in range(n):
        crop = str(rng.choice(CROP_LIST))
        variety = str(rng.choice(varieties))
        pest = float(rng.uniform(0.0, 1.0))
        ndvi = float(np.clip(rng.normal(0.6, 0.15), 0.1, 0.95))
        rain = float(max(0.0, rng.normal(150.0, 90.0)))
        temp = float(rng.normal(27.0, 3.5))
        solar = float(max(60.0, rng.normal(200.0, 50.0)))

        y_true = heuristic_yield(crop, variety, pest, ndvi, rain, temp, solar)
        d_true = heuristic_days(crop, pest, ndvi)

        # noise
        y_noisy = y_true * float(rng.normal(1.0, YIELD_NOISE_REL))
        d_noisy = d_true + float(rng.normal(0.0, DAYS_NOISE_ABS))

        X[i] = build_features(crop, variety, pest, ndvi, rain, temp, solar)
        y[i] = max(0.1, y_noisy)
        d[i] = max(20.0, d_noisy)

    return X, y, d


def train_one(X: np.ndarray, target: np.ndarray, label: str) -> XGBRegressor:
    print(f"[train] fitting XGBoost for {label} ({len(X)} samples)...")
    model = XGBRegressor(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        reg_lambda=1.0,
        random_state=SEED,
        n_jobs=-1,
        tree_method="hist",
    )
    t0 = time.time()
    model.fit(X, target)
    print(f"[train] {label} done in {time.time() - t0:.2f}s")
    return model


def main() -> None:
    print(f"Generating {N_SAMPLES} synthetic samples (seed={SEED})...")
    X, y_target, d_target = generate_synthetic(N_SAMPLES, SEED)
    print(f"  X shape: {X.shape}")
    print(f"  yield mean={y_target.mean():.2f} std={y_target.std():.2f} range=[{y_target.min():.2f}, {y_target.max():.2f}]")
    print(f"  days  mean={d_target.mean():.1f} std={d_target.std():.1f} range=[{d_target.min():.1f}, {d_target.max():.1f}]")

    yield_model = train_one(X, y_target, "yield")
    harvest_model = train_one(X, d_target, "harvest_days")

    YIELD_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(yield_model, YIELD_MODEL_PATH)
    joblib.dump(harvest_model, HARVEST_MODEL_PATH)
    print(f"\nSaved:\n  {YIELD_MODEL_PATH}\n  {HARVEST_MODEL_PATH}")

    print("\nSpot-check (first 5 train samples):")
    for i in range(5):
        y_pred = float(yield_model.predict(X[i : i + 1])[0])
        d_pred = float(harvest_model.predict(X[i : i + 1])[0])
        print(
            f"  sample {i}: yield true={y_target[i]:.2f} pred={y_pred:.2f} | "
            f"days true={d_target[i]:.1f} pred={d_pred:.1f}"
        )

    # Held-out check: an unseen synthetic sample
    print("\nHeld-out spot-check:")
    feat = build_features("padi", "Ciherang", 0.3, 0.7, 160.0, 27.0, 200.0).reshape(1, -1)
    print(f"  padi + Ciherang + light pest -> yield {float(yield_model.predict(feat)[0]):.2f} t/ha, days {float(harvest_model.predict(feat)[0]):.1f}")

    feat2 = build_features("padi", "Lokal", 0.9, 0.4, 50.0, 32.0, 180.0).reshape(1, -1)
    print(f"  padi + Lokal + heavy pest -> yield {float(yield_model.predict(feat2)[0]):.2f} t/ha, days {float(harvest_model.predict(feat2)[0]):.1f}")


if __name__ == "__main__":
    main()
