"""Prediksi yield per kecamatan + konversi ke surplus/defisit."""
from __future__ import annotations

from typing import TYPE_CHECKING

from model.train import load_model

if TYPE_CHECKING:
    import pandas as pd


def predict_yield(features_df: "pd.DataFrame") -> "pd.DataFrame":
    """Return DataFrame dengan kolom [kecamatan, yield_pred_ton_per_ha].

    Args:
        features_df: output `pipeline.features.build_feature_table` untuk tahun target
    """
    model = load_model()
    feature_cols = [c for c in features_df.columns if c not in ("kecamatan", "kabupaten", "tahun", "yield")]
    preds = model.predict(features_df[feature_cols])
    out = features_df[["kecamatan", "kabupaten", "tahun"]].copy()
    out["yield_pred_ton_per_ha"] = preds
    return out


def to_surplus_deficit(
    pred_df: "pd.DataFrame",
    luas_panen_df: "pd.DataFrame",
    konsumsi_per_kapita_kg: float = 95.0,
    populasi_df: "pd.DataFrame | None" = None,
) -> "pd.DataFrame":
    """Hitung surplus / defisit per kabupaten.

    Formula:
        produksi_prediksi = yield_pred × luas_panen
        konsumsi_kabupaten = populasi × konsumsi_per_kapita_kg / 1000  (jadi ton)
        surplus = produksi_prediksi − konsumsi_kabupaten
        status:
            > +10%  → SURPLUS
            -10..+10% → CUKUP
            < -10%  → DEFISIT

    Args:
        pred_df: output dari `predict_yield`
        luas_panen_df: [kecamatan, luas_panen_ha]
        konsumsi_per_kapita_kg: default ~95 kg/orang/tahun untuk beras
        populasi_df: [kabupaten, populasi] — kalau None pakai default dummy
    """
    raise NotImplementedError("TODO Day 3: implementasi surplus/defisit logic")
