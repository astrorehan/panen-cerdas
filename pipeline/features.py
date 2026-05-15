"""Feature engineering — join NDVI + cuaca + Kementan, buat lag features.

Output target: tabel siap-training dengan kolom
    [kecamatan, kabupaten, tahun, musim_tanam,
     ndvi_t1, ndvi_t2, ndvi_t3, ndvi_max_growing,
     rainfall_cum, temp_mean, temp_max,
     yield_lag1, yield_lag2,
     yield  # target]
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import pandas as pd

GROWING_SEASON_MONTHS_PADI = {
    "MT1": (10, 11, 12, 1, 2, 3),
    "MT2": (4, 5, 6, 7, 8, 9),
}


def build_feature_table(
    ndvi_df: "pd.DataFrame",
    weather_df: "pd.DataFrame",
    kementan_df: "pd.DataFrame",
) -> "pd.DataFrame":
    """Join semua sumber data ke satu tabel siap-training.

    Steps:
    1. Standardize nama kecamatan/kabupaten di semua df
    2. Hitung lag NDVI: T-3, T-2, T-1 bulan sebelum panen
    3. Hitung curah hujan kumulatif selama growing season
    4. Lag yield tahun sebelumnya per kecamatan
    5. Drop baris dengan terlalu banyak missing
    """
    raise NotImplementedError("TODO Day 2: implementasi join & lag features")


def split_train_test(
    df: "pd.DataFrame",
    test_years: tuple[int, ...] = (2023, 2024),
):
    """Time-based split — JANGAN random split untuk time series.

    Returns: (X_train, y_train, X_test, y_test)
    """
    feature_cols = [c for c in df.columns if c not in ("yield", "kecamatan", "kabupaten", "tahun")]
    mask_test = df["tahun"].isin(test_years)
    train = df[~mask_test]
    test = df[mask_test]
    return (
        train[feature_cols],
        train["yield"],
        test[feature_cols],
        test["yield"],
    )
