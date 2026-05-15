"""
regions_router.py
-----------------
Endpoints GeoJSON region untuk peta dashboard pemerintah.

Mode:
  - province = "DI Yogyakarta" (default) -> 7 kecamatan DIY (polygon real
    dari data/yogyakarta_kecamatan.geojson)
  - province = "ALL" / "Indonesia"       -> 37 provinsi (Point centroid
    dari provinces_data.py) - cocok untuk peta nasional bubble
  - province = nama provinsi lain        -> 1 Point centroid provinsi itu

Karena belum punya polygon real per-kecamatan untuk 37 provinsi lain,
mode non-DIY sengaja pakai Point dengan metadata lengkap. Frontend bisa
render bubble proporsional produksi (mirip carto bubble map).
"""

import json
import logging
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException

import provinces_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/regions", tags=["regions"])

GEOJSON_PATH = Path(__file__).parent / "data" / "yogyakarta_kecamatan.geojson"


@lru_cache(maxsize=1)
def _load_diy_geojson() -> dict:
    if not GEOJSON_PATH.exists():
        logger.error(f"GeoJSON DIY tidak ditemukan: {GEOJSON_PATH}")
        return {"type": "FeatureCollection", "features": []}
    with open(GEOJSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    n = len(data.get("features", []))
    logger.info(f"GeoJSON DIY loaded: {n} kecamatan")
    return data


def _province_features(provinces: list[provinces_data.Province]) -> list[dict]:
    """Bangun list Feature Point per provinsi (centroid)."""
    return [
        {
            "type": "Feature",
            "geometry": {
                "type":        "Point",
                "coordinates": [p.lon, p.lat],
            },
            "properties": {
                "id":         f"PROV_{p.code}",
                "code":       p.code,
                "name":       p.name,
                "kementan_name":   p.kementan_name,
                "capital":    p.capital,
                "region":     p.region,
                "level":      "province",
            },
        }
        for p in provinces
    ]


@router.get("/geojson")
def geojson(province: str = "DI Yogyakarta") -> dict:
    """
    Return GeoJSON sesuai mode (lihat module docstring).
    """
    key = (province or "").strip().upper()

    # Mode nasional: 37 provinsi sekaligus
    if key in ("ALL", "INDONESIA", "NASIONAL"):
        return {
            "type":     "FeatureCollection",
            "level":    "province",
            "features": _province_features(provinces_data.all_provinces()),
        }

    # Mode DIY: polygon kecamatan
    if provinces_data.is_diy(province):
        data = _load_diy_geojson()
        if not data["features"]:
            raise HTTPException(
                status_code=503,
                detail="GeoJSON DIY tidak tersedia di server",
            )
        out = dict(data)
        out["level"] = "kecamatan"
        return out

    # Mode provinsi single (selain DIY)
    prov = provinces_data.get(province)
    if not prov:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Provinsi '{province}' tidak dikenal. "
                f"Gunakan 'DI Yogyakarta' (kecamatan), 'ALL' (37 provinsi), "
                f"atau nama provinsi resmi."
            ),
        )
    return {
        "type":     "FeatureCollection",
        "level":    "province",
        "features": _province_features([prov]),
    }


@router.get("")
def list_regions(province: str = "DI Yogyakarta") -> dict:
    """Listing region (tanpa geometri). Berguna buat dropdown frontend."""
    key = (province or "").strip().upper()

    if key in ("ALL", "INDONESIA", "NASIONAL"):
        provs = provinces_data.all_provinces()
        return {
            "province": "Indonesia",
            "level":    "province",
            "count":    len(provs),
            "items": [
                {
                    "id":       f"PROV_{p.code}",
                    "code":     p.code,
                    "name":     p.name,
                    "capital":  p.capital,
                    "region":   p.region,
                }
                for p in provs
            ],
        }

    if provinces_data.is_diy(province):
        data = _load_diy_geojson()
        return {
            "province": province,
            "level":    "kecamatan",
            "count":    len(data["features"]),
            "items":    [f["properties"] for f in data["features"]],
        }

    prov = provinces_data.get(province)
    if not prov:
        raise HTTPException(
            status_code=404,
            detail=f"Provinsi '{province}' tidak dikenal",
        )
    return {
        "province": prov.name,
        "level":    "province",
        "count":    1,
        "items": [
            {
                "id":      f"PROV_{prov.code}",
                "code":    prov.code,
                "name":    prov.name,
                "capital": prov.capital,
                "region":  prov.region,
            }
        ],
    }


@router.get("/provinces", summary="Daftar 37 provinsi Indonesia")
def list_provinces() -> dict:
    """Index lengkap 37 provinsi (untuk dropdown frontend)."""
    provs = provinces_data.all_provinces()
    return {
        "count": len(provs),
        "items": [
            {
                "id":      f"PROV_{p.code}",
                "code":    p.code,
                "name":    p.name,
                "capital": p.capital,
                "region":  p.region,
                "lat":     p.lat,
                "lon":     p.lon,
            }
            for p in provs
        ],
    }
