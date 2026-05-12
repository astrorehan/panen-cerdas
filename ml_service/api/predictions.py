"""Prediction endpoints — list per kecamatan + detail drill-down.

Day 1: dummy data.
Day 2-3: replace with model.predict.predict_yield + to_surplus_deficit.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ml_service.schemas import (
    KecamatanDetail,
    KecamatanPrediction,
    NdviPoint,
    PredictionsResponse,
    YieldPoint,
)

router = APIRouter()

DUMMY_KECAMATAN: list[dict] = [
    {"id": "3204010", "kabupaten": "Bandung", "kecamatan": "Cikajang", "yield": 5.8, "luas": 2140, "surplus_pct": 18.2},
    {"id": "3207100", "kabupaten": "Ciamis", "kecamatan": "Pamarican", "yield": 5.6, "luas": 1980, "surplus_pct": 12.4},
    {"id": "3202050", "kabupaten": "Sukabumi", "kecamatan": "Cisaat", "yield": 5.4, "luas": 1820, "surplus_pct": 6.1},
    {"id": "3207080", "kabupaten": "Ciamis", "kecamatan": "Cikoneng", "yield": 5.2, "luas": 1610, "surplus_pct": 2.3},
    {"id": "3207030", "kabupaten": "Ciamis", "kecamatan": "Banjarsari", "yield": 4.9, "luas": 1450, "surplus_pct": -4.2},
    {"id": "3205010", "kabupaten": "Garut", "kecamatan": "Cibalong", "yield": 4.7, "luas": 1320, "surplus_pct": -12.8},
    {"id": "3205020", "kabupaten": "Garut", "kecamatan": "Pameungpeuk", "yield": 4.3, "luas": 1100, "surplus_pct": -23.1},
]


def _status(surplus_pct: float) -> str:
    if surplus_pct > 10:
        return "surplus"
    if surplus_pct > -10:
        return "cukup"
    if surplus_pct > -20:
        return "waspada"
    return "defisit"


@router.get("", response_model=PredictionsResponse)
def list_predictions(
    province: str = "Jawa Barat",
    commodity: str = "padi",
    season: str = "MT 2024-1",
) -> PredictionsResponse:
    items = [
        KecamatanPrediction(
            id=row["id"],
            kabupaten=row["kabupaten"],
            kecamatan=row["kecamatan"],
            yield_pred_ton_per_ha=row["yield"],
            luas_panen_ha=row["luas"],
            produksi_pred_ton=round(row["yield"] * row["luas"]),
            surplus_pct=row["surplus_pct"],
            status=_status(row["surplus_pct"]),
        )
        for row in DUMMY_KECAMATAN
    ]
    return PredictionsResponse(province=province, commodity=commodity, season=season, items=items)


@router.get("/{kecamatan_id}", response_model=KecamatanDetail)
def get_detail(kecamatan_id: str) -> KecamatanDetail:
    row = next((r for r in DUMMY_KECAMATAN if r["id"] == kecamatan_id), None)
    if not row:
        raise HTTPException(status_code=404, detail=f"Kecamatan {kecamatan_id} tidak ditemukan")

    import math
    from datetime import date, timedelta

    start = date(2018, 1, 1)
    series: list[NdviPoint] = []
    for i in range(84):
        d = start + timedelta(days=30 * i)
        ndvi = 0.55 + 0.2 * math.sin(i * math.pi / 6) + 0.02 * ((i % 5) - 2)
        series.append(NdviPoint(date=d.isoformat(), ndvi=round(ndvi, 3)))

    backtest = [
        YieldPoint(year=2018, value=5.2, kind="aktual"),
        YieldPoint(year=2019, value=5.3, kind="aktual"),
        YieldPoint(year=2020, value=5.4, kind="aktual"),
        YieldPoint(year=2021, value=5.3, kind="aktual"),
        YieldPoint(year=2022, value=5.5, kind="aktual"),
        YieldPoint(year=2023, value=5.6, kind="prediksi"),
        YieldPoint(year=2024, value=row["yield"], kind="prediksi"),
    ]

    return KecamatanDetail(
        kecamatan=row["kecamatan"],
        kabupaten=row["kabupaten"],
        yield_pred_ton_per_ha=row["yield"],
        luas_panen_ha=row["luas"],
        total_produksi_ton=round(row["yield"] * row["luas"]),
        ndvi_series=series,
        backtest=backtest,
    )
