"""Ekstraksi NDVI Sentinel-2 per kecamatan via Google Earth Engine.

Prereq:
    pip install earthengine-api geemap
    earthengine authenticate

Contoh penggunaan (Day 2):
    import ee, geopandas as gpd
    from pipeline.sentinel import init_ee, ndvi_monthly_by_polygon

    init_ee(project="your-gcp-project")
    gdf = gpd.read_file("data/shapefiles/jabar_kecamatan.geojson")
    df = ndvi_monthly_by_polygon(gdf, start="2018-01-01", end="2024-12-31")
    df.to_parquet("data/processed/ndvi_jabar.parquet")
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import geopandas as gpd
    import pandas as pd

CLOUD_FILTER_PERCENT = 20


def init_ee(project: str | None = None) -> None:
    """Inisialisasi koneksi Earth Engine. Panggil sekali per session."""
    import ee

    try:
        ee.Initialize(project=project) if project else ee.Initialize()
    except Exception:
        ee.Authenticate()
        ee.Initialize(project=project) if project else ee.Initialize()


def _mask_s2_clouds(image):
    """Mask piksel berawan menggunakan SCL band (Sentinel-2 L2A)."""
    import ee

    scl = image.select("SCL")
    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10))
    return image.updateMask(mask).divide(10000)


def _add_ndvi(image):
    """Hitung NDVI = (NIR - RED) / (NIR + RED)."""
    return image.addBands(image.normalizedDifference(["B8", "B4"]).rename("NDVI"))


def ndvi_monthly_by_polygon(
    gdf: "gpd.GeoDataFrame",
    start: str,
    end: str,
    name_col: str = "NAME_3",
) -> "pd.DataFrame":
    """Hitung NDVI bulanan (mean & max) per polygon dalam GeoDataFrame.

    Args:
        gdf: GeoDataFrame dengan polygon batas kecamatan (EPSG:4326)
        start: tanggal mulai 'YYYY-MM-DD'
        end:   tanggal akhir 'YYYY-MM-DD'
        name_col: kolom nama kecamatan di gdf

    Returns:
        DataFrame: kecamatan, tahun, bulan, ndvi_mean, ndvi_max
    """
    raise NotImplementedError(
        "TODO Day 2: implementasi GEE reduceRegions per bulan. "
        "Lihat docstring untuk contoh struktur."
    )


def ndvi_for_kecamatan(
    kecamatan_name: str,
    start: str,
    end: str,
) -> "pd.DataFrame":
    """Convenience: NDVI time series untuk 1 kecamatan saja (debug/eksplorasi)."""
    raise NotImplementedError("TODO Day 2")
