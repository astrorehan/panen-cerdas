"""
regions_router.py
-----------------
Endpoints GeoJSON kecamatan untuk choropleth pemerintah.

Data masih dummy — port langsung dari ml_service/api/regions.py lama.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/regions", tags=["regions"])


DUMMY_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"id": "3204010", "kabupaten": "Bandung", "kecamatan": "Cikajang"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [107.50, -7.05], [107.60, -7.05], [107.60, -6.95],
                    [107.50, -6.95], [107.50, -7.05],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {"id": "3207100", "kabupaten": "Ciamis", "kecamatan": "Pamarican"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [108.30, -7.40], [108.42, -7.40], [108.42, -7.30],
                    [108.30, -7.30], [108.30, -7.40],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {"id": "3202050", "kabupaten": "Sukabumi", "kecamatan": "Cisaat"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [106.85, -6.95], [106.95, -6.95], [106.95, -6.85],
                    [106.85, -6.85], [106.85, -6.95],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {"id": "3207080", "kabupaten": "Ciamis", "kecamatan": "Cikoneng"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [108.32, -7.32], [108.42, -7.32], [108.42, -7.22],
                    [108.32, -7.22], [108.32, -7.32],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {"id": "3207030", "kabupaten": "Ciamis", "kecamatan": "Banjarsari"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [108.50, -7.55], [108.60, -7.55], [108.60, -7.45],
                    [108.50, -7.45], [108.50, -7.55],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {"id": "3205010", "kabupaten": "Garut", "kecamatan": "Cibalong"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [107.80, -7.60], [107.90, -7.60], [107.90, -7.50],
                    [107.80, -7.50], [107.80, -7.60],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {"id": "3205020", "kabupaten": "Garut", "kecamatan": "Pameungpeuk"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [107.70, -7.65], [107.80, -7.65], [107.80, -7.55],
                    [107.70, -7.55], [107.70, -7.65],
                ]],
            },
        },
    ],
}


@router.get("/geojson")
def geojson(province: str = "Jawa Barat") -> dict:
    return DUMMY_GEOJSON


@router.get("")
def list_regions(province: str = "Jawa Barat") -> dict:
    return {
        "province": province,
        "count": len(DUMMY_GEOJSON["features"]),
        "items": [f["properties"] for f in DUMMY_GEOJSON["features"]],
    }
