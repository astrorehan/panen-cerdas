"""Evaluasi model — MAPE, RMSE, R² per kecamatan dan global."""
from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    import pandas as pd


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Percentage Error (%). Mengabaikan y_true == 0."""
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    mask = y_true != 0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(np.mean((np.asarray(y_true) - np.asarray(y_pred)) ** 2)))


def evaluate(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    from sklearn.metrics import r2_score

    return {
        "mape_pct": mape(y_true, y_pred),
        "rmse": rmse(y_true, y_pred),
        "r2": float(r2_score(y_true, y_pred)),
        "n": int(len(y_true)),
    }


def evaluate_per_kecamatan(
    df: "pd.DataFrame",
    actual_col: str = "yield",
    pred_col: str = "yield_pred_ton_per_ha",
    group_col: str = "kecamatan",
) -> "pd.DataFrame":
    """Hitung metrik per kecamatan — berguna untuk identifikasi worst-case."""
    import pandas as pd

    def _metrics(g: "pd.DataFrame") -> "pd.Series":
        return pd.Series(evaluate(g[actual_col].values, g[pred_col].values))

    return df.groupby(group_col, group_keys=False).apply(_metrics).reset_index()
