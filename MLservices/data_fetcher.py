"""
data_fetcher.py
---------------
Fetch data iklim real dari NASA POWER (suhu, curah hujan, radiasi).
Tidak perlu API key, gratis, dan reliable untuk demo.

Fallback otomatis ke nilai default jika API tidak tersedia.

v2.4:
  - estimate_ndvi_from_season() support semua 9 komoditas
  - Hapus hardcode crop_type default "padi" di fetch_bulk_for_training()
  - NDVI default per crop disesuaikan karakteristik tanaman
    (hortikultura umumnya NDVI lebih rendah dari pangan pokok)
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

# Semua crop yang didukung (harus konsisten dengan model.py)
SUPPORTED_CROPS = [
    "padi", "jagung", "kedelai",
    "ubi_jalar", "ubi_kayu",
    "cabe_besar", "cabe_rawit",
    "bawang_merah", "bawang_putih",
]

# ── NDVI BASELINE PER CROP ────────────────────────────────────────────────────
# NDVI musim hujan (Okt–Mar) vs kemarau (Apr–Sep)
# Sumber: estimasi berbasis karakteristik kanopi tanaman
#
# Tanaman pangan pokok (padi, jagung) → kanopi lebat → NDVI tinggi
# Umbi-umbian → kanopi sedang
# Hortikultura (cabe, bawang) → kanopi pendek/jarang → NDVI lebih rendah
# Bawang putih → tanaman dataran tinggi, kanopi sangat pendek
NDVI_BASE = {
    #                 musim_hujan  musim_kemarau
    "padi":          (0.72,        0.58),
    "jagung":        (0.65,        0.52),
    "kedelai":       (0.60,        0.48),
    "ubi_jalar":     (0.62,        0.50),   # kanopi merambat, cukup rapat
    "ubi_kayu":      (0.65,        0.52),   # kanopi semak, cukup lebat
    "cabe_besar":    (0.55,        0.44),   # tanaman perdu, kanopi terbatas
    "cabe_rawit":    (0.52,        0.42),   # lebih kecil dari cabe besar
    "bawang_merah":  (0.45,        0.38),   # daun silindris tipis → NDVI rendah
    "bawang_putih":  (0.42,        0.36),   # daun lebih sempit, dataran tinggi
}

# Jika crop tidak dikenal, pakai nilai aman ini
NDVI_FALLBACK = (0.58, 0.48)


# ── MAIN FETCH FUNCTION ────────────────────────────────────────────────────────
async def fetch_climate_data(lat: float, lon: float, days_back: int = 30) -> dict:
    """
    Fetch data iklim rata-rata N hari terakhir untuk koordinat tertentu.

    Urutan prioritas:
      1. NASA POWER (REST API, tanpa token)
      2. Nilai default Indonesia (fallback aman)

    Args:
        lat      : Latitude lahan (-11 s/d 6 untuk Indonesia)
        lon      : Longitude lahan (95 s/d 141 untuk Indonesia)
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


# ── NASA POWER ─────────────────────────────────────────────────────────────────
async def _fetch_nasa_power(lat: float, lon: float, days_back: int = 30) -> dict:
    """
    Fetch dari NASA POWER API.
    Dokumentasi: https://power.larc.nasa.gov/docs/services/api/

    Parameter yang diambil:
      T2M               = Suhu udara 2m dari permukaan (°C)
      PRECTOTCORR       = Curah hujan terkoreksi (mm/hari)
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
    temp_vals = [v for v in props["T2M"].values()               if v != -999]
    rain_vals = [v for v in props["PRECTOTCORR"].values()       if v != -999]
    rad_vals  = [v for v in props["ALLSKY_SFC_SW_DWN"].values() if v != -999]

    if not temp_vals:
        raise ValueError("NASA POWER tidak mengembalikan data suhu yang valid")

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


# ── NDVI ESTIMATOR ─────────────────────────────────────────────────────────────
def estimate_ndvi_from_season(
    lat: float,
    lon: float,
    crop_type: str,
    month: Optional[int] = None,
) -> float:
    """
    Estimasi NDVI berdasarkan musim tanam & jenis tanaman.

    NDVI aktual idealnya dari MODIS/Sentinel — ini fallback berbasis
    domain knowledge karakteristik kanopi tanaman Indonesia.

    Indonesia:
      - Musim hujan (Okt–Mar): vegetasi lebih hijau → NDVI lebih tinggi
      - Musim kemarau (Apr–Sep): vegetasi lebih kering → NDVI lebih rendah

    Hortikultura (cabe, bawang):
      - Kanopi lebih pendek/jarang → NDVI lebih rendah dari pangan pokok
      - Bawang khususnya memiliki NDVI rendah karena daun silindris tipis

    Args:
        lat       : Latitude lahan
        lon       : Longitude lahan
        crop_type : Jenis tanaman (salah satu dari SUPPORTED_CROPS)
        month     : Bulan saat ini (1–12). Default: bulan sekarang.

    Returns:
        float: Estimasi NDVI (0.0–0.95)
    """
    if month is None:
        month = datetime.today().month

    is_wet_season = month in [10, 11, 12, 1, 2, 3]

    # Ambil baseline NDVI per crop
    wet_ndvi, dry_ndvi = NDVI_BASE.get(crop_type, NDVI_FALLBACK)
    base_ndvi = wet_ndvi if is_wet_season else dry_ndvi

    if crop_type not in NDVI_BASE:
        logger.warning(
            f"crop_type '{crop_type}' tidak ada di NDVI_BASE → pakai fallback {base_ndvi}. "
            f"Crop yang didukung: {SUPPORTED_CROPS}"
        )

    # Jawa & Bali: irigasi lebih baik → NDVI lebih stabil & sedikit lebih tinggi
    # Kecuali bawang & cabe: pengaruh irigasi ke NDVI lebih kecil
    is_java_bali = (-9 <= lat <= -5) and (105 <= lon <= 116)
    if is_java_bali and crop_type in ("padi", "jagung", "kedelai", "ubi_jalar", "ubi_kayu"):
        base_ndvi += 0.05
    elif is_java_bali:
        base_ndvi += 0.02   # pengaruh lebih kecil untuk hortikultura

    return round(min(base_ndvi, 0.95), 2)


# ── BULK FETCH untuk TRAINING DATA ────────────────────────────────────────────
async def fetch_bulk_for_training(
    locations: list[dict],
    days_back: int = 90,
) -> list[dict]:
    """
    Fetch data iklim untuk banyak lokasi sekaligus (untuk seed training data).

    Args:
        locations: list of dict dengan keys:
                   - lat        : float (wajib)
                   - lon        : float (wajib)
                   - crop_type  : str   (wajib — salah satu SUPPORTED_CROPS)
                   - provinsi   : str   (opsional)
                   - land_area_ha: float (opsional, default 1.0)
        days_back : periode historis dalam hari

    Returns:
        list of dict siap pakai sebagai training data

    Contoh locations:
        [
            {"lat": -7.25, "lon": 112.75, "crop_type": "padi",         "provinsi": "Jawa Timur"},
            {"lat": -7.25, "lon": 112.75, "crop_type": "bawang_merah", "provinsi": "Jawa Timur"},
            {"lat": -8.50, "lon": 115.25, "crop_type": "cabe_besar",   "provinsi": "Bali"},
        ]
    """
    # Validasi: pastikan semua entri punya crop_type yang valid
    for i, loc in enumerate(locations):
        ct = loc.get("crop_type")
        if not ct:
            logger.warning(f"locations[{i}] tidak punya crop_type — dilewati")
            continue
        if ct not in SUPPORTED_CROPS:
            logger.warning(
                f"locations[{i}] crop_type='{ct}' tidak dikenal. "
                f"Pilihan: {SUPPORTED_CROPS}"
            )

    tasks   = [fetch_climate_data(loc["lat"], loc["lon"], days_back) for loc in locations]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    training_rows = []
    for loc, climate in zip(locations, results):
        ct = loc.get("crop_type")
        if not ct or ct not in SUPPORTED_CROPS:
            logger.warning(f"Skip lokasi {loc} — crop_type tidak valid: '{ct}'")
            continue

        if isinstance(climate, Exception):
            logger.warning(f"Gagal fetch untuk {loc}: {climate}")
            climate = {**INDONESIA_DEFAULTS, "data_source": "default_fallback"}

        row = {
            "ndvi":            estimate_ndvi_from_season(loc["lat"], loc["lon"], ct),
            "rainfall_mm":     climate["rainfall_mm"],
            "temperature_c":   climate["temperature_c"],
            "solar_radiation": climate["solar_radiation"],
            "land_area_ha":    loc.get("land_area_ha", 1.0),
            "crop_type":       ct,
            "provinsi":        loc.get("provinsi", "unknown"),
            "lat":             loc["lat"],
            "lon":             loc["lon"],
            "data_source":     climate.get("data_source", "nasa_power"),
        }
        training_rows.append(row)

    return training_rows


# ── CLI TEST ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json

    async def main():
        print("🌍 Test fetch NASA POWER + NDVI estimasi untuk semua komoditas\n")

        test_locations = [
            {"lat": -7.25,  "lon": 112.75, "label": "Surabaya, Jawa Timur"},
            {"lat": -6.90,  "lon": 107.60, "label": "Bandung, Jawa Barat"},
            {"lat": -8.50,  "lon": 115.25, "label": "Bali"},
            {"lat":  3.60,  "lon":  98.67, "label": "Medan, Sumatera Utara"},
            {"lat": -5.14,  "lon": 119.43, "label": "Makassar, Sulawesi Selatan"},
        ]

        print("── Data Iklim ──────────────────────────────────────")
        for loc in test_locations:
            result = await fetch_climate_data(loc["lat"], loc["lon"], days_back=30)
            print(f"📍 {loc['label']}")
            print(f"   Suhu           : {result['temperature_c']} °C")
            print(f"   Curah hujan    : {result['rainfall_mm']} mm")
            print(f"   Radiasi        : {result['solar_radiation']} MJ/m²")
            print(f"   Sumber         : {result['data_source']}")
            print()

        print("── Estimasi NDVI per Komoditas (Surabaya) ──────────")
        lat, lon = -7.25, 112.75
        for crop in SUPPORTED_CROPS:
            ndvi = estimate_ndvi_from_season(lat, lon, crop)
            print(f"   {crop:<15} : NDVI = {ndvi}")

        print("\n── Bulk Fetch Test ──────────────────────────────────")
        bulk_locs = [
            {"lat": -7.25, "lon": 112.75, "crop_type": "padi",         "provinsi": "Jawa Timur"},
            {"lat": -7.25, "lon": 112.75, "crop_type": "bawang_merah", "provinsi": "Jawa Timur"},
            {"lat": -8.50, "lon": 115.25, "crop_type": "cabe_besar",   "provinsi": "Bali"},
            {"lat": -7.80, "lon": 110.36, "crop_type": "bawang_putih", "provinsi": "Jawa Tengah"},
        ]
        rows = await fetch_bulk_for_training(bulk_locs, days_back=30)
        for r in rows:
            print(f"   {r['crop_type']:<15} | NDVI={r['ndvi']} | "
                  f"T={r['temperature_c']}°C | R={r['rainfall_mm']}mm | "
                  f"src={r['data_source']}")

    asyncio.run(main())
