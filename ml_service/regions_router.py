"""
regions_router.py
-----------------
Endpoints GeoJSON kecamatan untuk choropleth pemerintah.

Polygons di-load dari data/jawa_barat_kecamatan.geojson — boundary
irregular hasil generate algoritmik (bukan square). Ganti file ini
dengan ekspor BPS Wilayah / GADM level 3 saat tersedia, struktur
properties (id/kabupaten/kecamatan) wajib dipertahankan.
"""

import json
import logging
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/regions", tags=["regions"])

GEOJSON_PATH = Path(__file__).parent / "data" / "jawa_barat_kecamatan.geojson"


@lru_cache(maxsize=1)
def _load_geojson() -> dict:
    if not GEOJSON_PATH.exists():
        logger.error(f"GeoJSON tidak ditemukan: {GEOJSON_PATH}")
        return {"type": "FeatureCollection", "features": []}
    with open(GEOJSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    n = len(data.get("features", []))
    logger.info(f"GeoJSON loaded: {n} kecamatan dari {GEOJSON_PATH.name}")
    return data


@router.get("/geojson")
def geojson(province: str = "Jawa Barat") -> dict:
    data = _load_geojson()
    if not data["features"]:
        raise HTTPException(
            status_code=503,
            detail="GeoJSON kecamatan tidak tersedia di server",
        )
    return data


@router.get("")
def list_regions(province: str = "Jawa Barat") -> dict:
    data = _load_geojson()
    return {
        "province": province,
        "count": len(data["features"]),
        "items": [f["properties"] for f in data["features"]],
    }
