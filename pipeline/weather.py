"""Ekstraksi data cuaca: curah hujan, suhu, kelembaban per kabupaten/kecamatan.

Dua sumber:
1. ERA5 via Earth Engine (REKOMENDASI Day 2 — reliable, sudah gridded)
2. BMKG public data (fallback / pelengkap — kalau API stabil)

Output: DataFrame dengan kolom
    [kecamatan, tahun, bulan, rainfall_mm, temp_mean_c, temp_max_c, humidity_pct]
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import geopandas as gpd
    import pandas as pd


def era5_monthly_by_polygon(
    gdf: "gpd.GeoDataFrame",
    start: str,
    end: str,
    name_col: str = "NAME_3",
) -> "pd.DataFrame":
    """Agregasi ERA5-Land bulanan per polygon via Earth Engine.

    Bands ERA5-Land yang relevan:
    - total_precipitation_sum (m)            → konversi ke mm
    - temperature_2m (K)                     → konversi ke Celsius
    - temperature_2m_max (K)
    - dewpoint_temperature_2m (K)            → derive humidity
    """
    raise NotImplementedError("TODO Day 2: implementasi ECMWF/ERA5_LAND/MONTHLY_AGGR")


def bmkg_fetch_station(
    station_id: str,
    start: str,
    end: str,
) -> "pd.DataFrame":
    """Fetch data harian dari satu stasiun BMKG.

    BMKG punya beberapa endpoint:
    - https://dataonline.bmkg.go.id (perlu register, ada CSV download)
    - https://api.bmkg.go.id (forecast, bukan historis)

    Strategi: kalau API tidak stabil, pakai ERA5 saja dan sebut BMKG di pitch
    sebagai "future integration".
    """
    raise NotImplementedError("TODO Day 2: scrape atau API BMKG kalau memungkinkan")


def aggregate_to_polygon(
    daily_station_df: "pd.DataFrame",
    gdf_stations: "gpd.GeoDataFrame",
    gdf_polygons: "gpd.GeoDataFrame",
    method: str = "nearest",
) -> "pd.DataFrame":
    """Map data per stasiun ke polygon kecamatan (nearest neighbor atau IDW)."""
    raise NotImplementedError("TODO Day 2")
