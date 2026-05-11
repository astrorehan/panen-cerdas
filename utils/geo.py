"""Geospatial helpers — load shapefile, name standardization."""
from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import geopandas as gpd

SHAPEFILE_DIR = Path("data/shapefiles")


def load_kecamatan_jabar() -> "gpd.GeoDataFrame":
    """Load batas kecamatan Jawa Barat (GADM level 3 atau setara).

    Expected files (taruh di data/shapefiles/):
    - gadm41_IDN_3.shp (atau .geojson) — level kecamatan
    Filter: NAME_1 == 'Jawa Barat'
    """
    import geopandas as gpd

    candidates = [
        SHAPEFILE_DIR / "jabar_kecamatan.geojson",
        SHAPEFILE_DIR / "gadm41_IDN_3.json",
        SHAPEFILE_DIR / "gadm41_IDN_3.shp",
    ]
    for p in candidates:
        if p.exists():
            gdf = gpd.read_file(p)
            if "NAME_1" in gdf.columns:
                gdf = gdf[gdf["NAME_1"].str.lower().str.contains("jawa barat", na=False)]
            return gdf.to_crs(epsg=4326)
    raise FileNotFoundError(
        f"Shapefile tidak ditemukan. Download GADM Indonesia level 3 ke {SHAPEFILE_DIR}/"
    )


def normalize_name(s: str) -> str:
    """Normalisasi nama wilayah untuk join lintas-sumber."""
    if not isinstance(s, str):
        return ""
    s = s.strip().upper()
    for prefix in ("KAB. ", "KABUPATEN ", "KOTA ", "KEC. ", "KECAMATAN "):
        if s.startswith(prefix):
            s = s[len(prefix):]
            break
    return s.strip()
