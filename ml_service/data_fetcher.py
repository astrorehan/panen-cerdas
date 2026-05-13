"""
data_fetcher.py
---------------
Fetch data iklim real dari NASA POWER (suhu, curah hujan, radiasi).
Tidak perlu API key, gratis, dan reliable untuk demo.

Fallback otomatis ke nilai default jika API tidak tersedia.
"""

import httpx
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

# Nilai default per wilayah Indonesia jika semua API gagal
INDONESIA_DEFAULTS = {
    "temperature_c":   27.0,
    "rainfall_mm":     120.0,
    "solar_radiation": 185.0,
}


# ── MAIN FETCH FUNCTION ────────────────────────────────
async def fetch_climate_data(lat: float, lon: float, days_back: int = 30) -> dict:
    """
    Fetch data iklim rata-rata N hari terakhir untuk koordinat tertentu.

    Urutan prioritas:
      1. NASA POWER (REST API, tanpa token)
      2. Nilai default Indonesia (fallback aman)

    Args:
        lat: Latitude lahan (-11 s/d 6 untuk Indonesia)
        lon: Longitude lahan (95 s/d 141 untuk Indonesia)
        days_back: Jumlah hari ke belakang untuk dirata-rata

    Returns:
        dict dengan keys: temperature_c, rainfall_mm, solar_radiation, data_source
    """
    try:
        result = await _fetch_nasa_power(lat, lon, days_back)
        logger.info(f"NASA POWER berhasil untuk ({lat}, {lon})")
        return result
    except Exception as e:
        logger.warning(f"NASA POWER gagal: {e} — pakai nilai default Indonesia")
        return {**INDONESIA_DEFAULTS, "data_source": "default_fallback", "lat": lat, "lon": lon}


def fetch_climate_data_sync(lat: float, lon: float, days_back: int = 30) -> dict:
    """Versi synchronous dari fetch_climate_data (untuk script & retrain)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, _fetch_nasa_power(lat, lon, days_back))
                return future.result(timeout=30)
        else:
            return loop.run_until_complete(_fetch_nasa_power(lat, lon, days_back))
    except Exception as e:
        logger.warning(f"fetch_climate_data_sync gagal: {e}")
        return {**INDONESIA_DEFAULTS, "data_source": "default_fallback", "lat": lat, "lon": lon}


# ── NASA POWER ─────────────────────────────────────────
async def _fetch_nasa_power(lat: float, lon: float, days_back: int = 30) -> dict:
    """
    Fetch dari NASA POWER API.
    Dokumentasi: https://power.larc.nasa.gov/docs/services/api/

    Parameter yang diambil:
      T2M             = Suhu udara 2m dari permukaan (°C)
      PRECTOTCORR     = Curah hujan terkoreksi (mm/hari)
      ALLSKY_SFC_SW_DWN = Radiasi matahari permukaan (MJ/m²/hari)
    """
    end_date   = datetime.today()
    start_date = end_date - timedelta(days=days_back)

    params = {
        "parameters": "T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN",
        "community":  "AG",
        "longitude":  lon,
        "latitude":   lat,
        "start":      start_date.strftime("%Y%m%d"),
        "end":        end_date.strftime("%Y%m%d"),
        "format":     "JSON",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(NASA_POWER_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    props = data["properties"]["parameter"]

    # Filter nilai invalid (-999 = missing data di NASA POWER)
    temp_vals = [v for v in props["T2M"].values()             if v != -999]
    rain_vals = [v for v in props["PRECTOTCORR"].values()     if v != -999]
    rad_vals  = [v for v in props["ALLSKY_SFC_SW_DWN"].values() if v != -999]

    if not temp_vals:
        raise ValueError("NASA POWER tidak mengembalikan data suhu yang valid")

    # Suhu  = rata-rata harian
    # Hujan = total akumulasi periode (bukan rata-rata harian)
    # Radiasi = rata-rata harian
    return {
        "temperature_c":   round(sum(temp_vals) / len(temp_vals), 1),
        "rainfall_mm":     round(sum(rain_vals), 1) if rain_vals else INDONESIA_DEFAULTS["rainfall_mm"],
        "solar_radiation": round(sum(rad_vals) / len(rad_vals), 1) if rad_vals else INDONESIA_DEFAULTS["solar_radiation"],
        "data_source":     "nasa_power",
        "lat":             lat,
        "lon":             lon,
        "period_days":     days_back,
        "fetched_at":      datetime.utcnow().isoformat(),
    }


# ── NDVI HELPER ────────────────────────────────────────
def estimate_ndvi_from_season(lat: float, lon: float, crop_type: str) -> float:
    """
    Estimasi NDVI berdasarkan musim tanam Indonesia.
    NDVI aktual idealnya dari MODIS/Sentinel — ini fallback berbasis domain knowledge.

    Indonesia:
      - Musim hujan (Okt–Mar): vegetasi lebih hijau → NDVI lebih tinggi
      - Musim kemarau (Apr–Sep): vegetasi lebih kering → NDVI lebih rendah
    """
    month = datetime.today().month
    is_wet_season = month in [10, 11, 12, 1, 2, 3]

    base_ndvi = {
        "padi":     0.72 if is_wet_season else 0.58,
        "jagung":   0.65 if is_wet_season else 0.52,
        "kedelai":  0.60 if is_wet_season else 0.48,
        "singkong": 0.55 if is_wet_season else 0.45,
    }

    # Jawa & Bali punya irigasi lebih baik → NDVI lebih stabil
    is_java_bali = (-9 <= lat <= -5) and (105 <= lon <= 116)
    adjustment   = 0.05 if is_java_bali else 0.0

    ndvi = base_ndvi.get(crop_type, 0.60) + adjustment
    return round(min(ndvi, 0.95), 2)


# ── BULK FETCH untuk TRAINING DATA ─────────────────────
async def fetch_bulk_for_training(locations: list[dict], days_back: int = 90) -> list[dict]:
    """
    Fetch data iklim untuk banyak lokasi sekaligus (untuk seed training data).

    Args:
        locations: list of {"lat": float, "lon": float, "crop_type": str, "provinsi": str}
        days_back: periode historis dalam hari

    Returns:
        list of dict siap pakai sebagai training data
    """
    tasks   = [fetch_climate_data(loc["lat"], loc["lon"], days_back) for loc in locations]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    training_rows = []
    for loc, climate in zip(locations, results):
        if isinstance(climate, Exception):
            logger.warning(f"Gagal fetch untuk {loc}: {climate}")
            climate = {**INDONESIA_DEFAULTS, "data_source": "default_fallback"}

        crop = loc.get("crop_type", "padi")
        row  = {
            "ndvi":            estimate_ndvi_from_season(loc["lat"], loc["lon"], crop),
            "rainfall_mm":     climate["rainfall_mm"],
            "temperature_c":   climate["temperature_c"],
            "solar_radiation": climate["solar_radiation"],
            "land_area_ha":    loc.get("land_area_ha", 1.0),
            "crop_type":       crop,
            "provinsi":        loc.get("provinsi", "unknown"),
            "lat":             loc["lat"],
            "lon":             loc["lon"],
            "data_source":     climate.get("data_source", "nasa_power"),
        }
        training_rows.append(row)

    return training_rows


# ── CLI TEST ───────────────────────────────────────────
if __name__ == "__main__":
    import json

    async def main():
        print("🌍 Test fetch NASA POWER untuk beberapa lokasi Indonesia...\n")

        test_locations = [
            {"lat": -7.25, "lon": 112.75, "label": "Surabaya, Jawa Timur"},
            {"lat": -6.90, "lon": 107.60, "label": "Bandung, Jawa Barat"},
            {"lat": -8.50, "lon": 115.25, "label": "Bali"},
            {"lat":  3.60, "lon":  98.67, "label": "Medan, Sumatera Utara"},
            {"lat": -5.14, "lon": 119.43, "label": "Makassar, Sulawesi Selatan"},
        ]

        for loc in test_locations:
            result = await fetch_climate_data(loc["lat"], loc["lon"], days_back=30)
            print(f"📍 {loc['label']}")
            print(f"   Suhu rata-rata  : {result['temperature_c']} °C")
            print(f"   Curah hujan     : {result['rainfall_mm']} mm")
            print(f"   Radiasi matahari: {result['solar_radiation']} MJ/m²")
            print(f"   Sumber data     : {result['data_source']}")
            print()

    asyncio.run(main())
