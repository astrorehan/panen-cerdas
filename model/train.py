"""Training XGBoost untuk prediksi yield padi per kecamatan.

Run:
    python -m model.train
"""
from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import joblib

if TYPE_CHECKING:
    import pandas as pd

MODEL_PATH = Path("data/models/xgb_padi_jabar.pkl")


def train_xgb(
    X_train: "pd.DataFrame",
    y_train: "pd.Series",
    X_val: "pd.DataFrame | None" = None,
    y_val: "pd.Series | None" = None,
    params: dict | None = None,
):
    """Train XGBoost regressor dengan early stopping kalau ada validation set."""
    from xgboost import XGBRegressor

    default_params = {
        "n_estimators": 800,
        "max_depth": 6,
        "learning_rate": 0.05,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "min_child_weight": 3,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "random_state": 42,
        "n_jobs": -1,
        "tree_method": "hist",
    }
    if params:
        default_params.update(params)

    model = XGBRegressor(**default_params)
    if X_val is not None:
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    else:
        model.fit(X_train, y_train)
    return model


def save_model(model, path: Path = MODEL_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)


def load_model(path: Path = MODEL_PATH):
    return joblib.load(path)


def main() -> None:
    """Pipeline lengkap: load features → split → train → save.

    Day 2: lengkapi ini agar bisa dijalankan end-to-end.
    """
    raise NotImplementedError(
        "TODO Day 2: panggil pipeline.features.build_feature_table(), "
        "split_train_test(), lalu train_xgb() dan save_model()."
    )


if __name__ == "__main__":
    main()
