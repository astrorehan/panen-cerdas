"""Dashboard endpoints — KPI tiles + national/provincial trend.

Day 1: returns dummy data.
Day 2-3: bind to model/predict.py output.
"""
from __future__ import annotations

from fastapi import APIRouter

from ml_service.schemas import (
    DashboardSummary,
    KpiTile,
    YieldPoint,
    YieldTrend,
)

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def summary(province: str = "Jawa Barat", season: str = "MT 2024") -> DashboardSummary:
    return DashboardSummary(
        province=province,
        season=season,
        tiles=[
            KpiTile(label="Prediksi Produksi", value="1.42 jt ton", delta="+3.1% vs 2023", positive=True),
            KpiTile(label="Status Pangan", value="SURPLUS", delta="+182 rb ton", positive=True),
            KpiTile(label="Kecamatan Defisit", value="12 / 627", delta="-4 vs 2023", positive=True),
            KpiTile(label="Akurasi Model", value="MAPE 13.4%", delta="Backtested 2023", positive=True),
        ],
    )


@router.get("/trend", response_model=YieldTrend)
def trend(province: str = "Jawa Barat", commodity: str = "padi") -> YieldTrend:
    return YieldTrend(
        province=province,
        commodity=commodity,
        unit="juta ton",
        points=[
            YieldPoint(year=2018, value=1.30, kind="aktual"),
            YieldPoint(year=2019, value=1.32, kind="aktual"),
            YieldPoint(year=2020, value=1.35, kind="aktual"),
            YieldPoint(year=2021, value=1.33, kind="aktual"),
            YieldPoint(year=2022, value=1.38, kind="aktual"),
            YieldPoint(year=2023, value=1.37, kind="aktual"),
            YieldPoint(year=2024, value=1.42, kind="prediksi"),
        ],
    )
