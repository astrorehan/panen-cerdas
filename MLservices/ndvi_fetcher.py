"""
ndvi_fetcher.py
---------------
Fetch data NDVI real dari NASA APPEEARS API (MODIS MOD13Q1 v061).

Tidak perlu API key untuk submit task — cukup daftar akun gratis di:
  https://appeears.earthdatacloud.nasa.gov/

Cara kerja APPEEARS:
  1. Login → dapat token (berlaku 48 jam)
  2. Submit task → dapat task_id
  3. Poll status sampai "done" (biasanya 1–5 menit)
  4. Download hasil CSV → ambil nilai NDVI

Produk yang dipakai:
  MOD13Q1.061 — MODIS Terra Vegetation Indices 16-Day 250m
  Band: _250m_16_days_NDVI  (nilai 0–10000, dibagi 10000 = 0.0–1.0)

Fallback:
  Jika APPEEARS tidak tersedia atau timeout → estimasi dari musim
  (logika yang sudah ada di data_fetcher.py)

Environment variables (.env):
  APPEEARS_USER=email_kamu@gmail.com
  APPEEARS_PASS=password_kamu
"""

import asyncio
import httpx
import logging
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── KONSTANTA ──────────────────────────────────────────
APPEEARS_BASE     = "https://appeears.earthdatacloud.nasa.gov/api"
APPEEARS_USER     = os.getenv("APPEEARS_USER", "")
APPEEARS_PASS     = os.getenv("APPEEARS_PASS", "")

MODIS_PRODUCT     = "MOD13Q1.061"
MODIS_LAYER       = "_250m_16_days_NDVI"

# APPEEARS kadang mengirim nama file/kolom dalam beberapa variasi format.
# Kita cek semua kemungkinan ini secara berurutan.
NDVI_FILE_PATTERNS  = ["NDVI", "ndvi", "_250m_16_days_NDVI", "MOD13Q1"]
NDVI_COLUMN_PATTERNS = ["NDVI", "ndvi", "_250m_16_days_NDVI", "MOD13Q1"]

# Polling: cek status tiap N detik, maksimal M kali
POLL_INTERVAL_SEC = 15
POLL_MAX_ATTEMPTS = 80      # 80 × 15 detik = 120 menit maksimal

# Token di-cache di memory selama sesi berjalan
_token_cache: dict = {"token": None, "expires_at": 0.0}


# ── AUTH ───────────────────────────────────────────────
async def _get_token(client: httpx.AsyncClient) -> str:
    """
    Login ke APPEEARS dan dapat bearer token.
    Token di-cache agar tidak login ulang setiap request.
    Berlaku 48 jam — kita refresh setelah 47 jam.
    """
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    if not APPEEARS_USER or not APPEEARS_PASS:
        raise ValueError(
            "APPEEARS_USER dan APPEEARS_PASS belum diset di .env\n"
            "Daftar gratis di: https://appeears.earthdatacloud.nasa.gov/"
        )

    resp = await client.post(
        f"{APPEEARS_BASE}/login",
        auth=(APPEEARS_USER, APPEEARS_PASS),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    token = data["token"]
    _token_cache["token"]      = token
    _token_cache["expires_at"] = now + 47 * 3600   # refresh setelah 47 jam

    logger.info("APPEEARS login berhasil, token valid 47 jam")
    return token


# ── SUBMIT TASK ────────────────────────────────────────
async def _submit_task(
    client: httpx.AsyncClient,
    token: str,
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
    task_name: str,
) -> str:
    """
    Submit point-sampling task ke APPEEARS.
    Mengembalikan task_id untuk di-poll statusnya.

    Args:
        start_date, end_date: format "MM-DD-YYYY"
    """
    payload = {
        "task_type": "point",
        "task_name": task_name,
        "params": {
            "dates": [{"startDate": start_date, "endDate": end_date}],
            "layers": [{"product": MODIS_PRODUCT, "layer": MODIS_LAYER}],
            "coordinates": [
                {"latitude": lat, "longitude": lon, "id": "lahan", "category": "ndvi"}
            ],
            "output": {"format": {"type": "csv"}, "projection": "geographic"},
        },
    }

    resp = await client.post(
        f"{APPEEARS_BASE}/task",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    resp.raise_for_status()
    task_id = resp.json()["task_id"]
    logger.info(f"APPEEARS task submitted: {task_id}")
    return task_id


# ── POLL STATUS ────────────────────────────────────────
async def _wait_for_task(
    client: httpx.AsyncClient,
    token: str,
    task_id: str,
) -> bool:
    """
    Poll status task sampai selesai atau timeout.
    Return True jika done, False jika timeout/error.
    """
    headers = {"Authorization": f"Bearer {token}"}

    for attempt in range(POLL_MAX_ATTEMPTS):
        await asyncio.sleep(POLL_INTERVAL_SEC)

        resp = await client.get(
            f"{APPEEARS_BASE}/task/{task_id}",
            headers=headers,
            timeout=15,
        )
        resp.raise_for_status()
        status = resp.json().get("status", "")

        logger.debug(f"APPEEARS task {task_id} status: {status} (attempt {attempt+1})")

        if status == "done":
            return True
        elif status in ("error", "deleted"):
            logger.warning(f"APPEEARS task gagal dengan status: {status}")
            return False

    logger.warning(f"APPEEARS task {task_id} timeout setelah {POLL_MAX_ATTEMPTS} percobaan")
    return False


# ── DOWNLOAD & PARSE HASIL ─────────────────────────────
async def _download_ndvi(
    client: httpx.AsyncClient,
    token: str,
    task_id: str,
) -> Optional[float]:
    """
    Download file CSV hasil task dan ambil rata-rata NDVI.
    MODIS NDVI disimpan sebagai integer (×10000), dibagi 10000 jadi 0.0–1.0.
    Nilai fill/invalid: -3000 (dibuang).

    Fix: APPEEARS API kadang mengembalikan struktur bundle yang berbeda-beda
    tergantung versi API dan tipe produk. Fungsi ini mencoba beberapa
    variasi nama file dan kolom secara fleksibel.
    """
    import io
    import csv as csv_module

    headers = {"Authorization": f"Bearer {token}"}

    # ── 1. List semua file di bundle ──────────────────────────────────────────
    resp = await client.get(
        f"{APPEEARS_BASE}/bundle/{task_id}",
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    bundle = resp.json()

    # APPEEARS bisa kirim "files" sebagai list of dict atau nested dict
    # Normalkan ke list of {"file_id": ..., "file_name": ...}
    raw_files = bundle.get("files", [])
    if isinstance(raw_files, dict):
        # Format lama: {"file_id": {"file_name": ...}, ...}
        file_list = [{"file_id": fid, **fdata} for fid, fdata in raw_files.items()]
    else:
        file_list = raw_files

    # Debug: log semua nama file yang tersedia
    all_names = [f.get("file_name", f.get("name", str(f))) for f in file_list]
    logger.info(f"Bundle {task_id} berisi {len(file_list)} file: {all_names}")

    # ── 2. Cari file CSV yang mengandung NDVI ─────────────────────────────────
    # Coba pola nama file secara berurutan
    ndvi_file = None
    for pattern in NDVI_FILE_PATTERNS:
        ndvi_file = next(
            (
                f for f in file_list
                if pattern in f.get("file_name", f.get("name", ""))
                and (
                    f.get("file_name", f.get("name", "")).endswith(".csv")
                    or "csv" in f.get("file_type", "").lower()
                )
            ),
            None,
        )
        if ndvi_file:
            logger.info(f"File NDVI ditemukan dengan pola '{pattern}': {ndvi_file.get('file_name', ndvi_file.get('name'))}")
            break

    # Fallback: ambil file CSV apapun yang ada (mungkin satu-satunya)
    if ndvi_file is None:
        csv_files = [
            f for f in file_list
            if f.get("file_name", f.get("name", "")).endswith(".csv")
        ]
        if csv_files:
            ndvi_file = csv_files[0]
            logger.warning(
                f"Tidak ada file yang cocok pola NDVI — pakai file CSV pertama: "
                f"{ndvi_file.get('file_name', ndvi_file.get('name'))}"
            )

    if ndvi_file is None:
        logger.warning(
            f"Tidak ada file CSV di bundle APPEEARS.\n"
            f"Semua file: {all_names}\n"
            f"Kemungkinan task belum selesai sempurna atau produk tidak tersedia di lokasi ini."
        )
        return None

    # ── 3. Download file CSV ──────────────────────────────────────────────────
    file_id = ndvi_file.get("file_id") or ndvi_file.get("id")
    if not file_id:
        logger.warning(f"file_id tidak ditemukan di entry: {ndvi_file}")
        return None

    dl_resp = await client.get(
        f"{APPEEARS_BASE}/bundle/{task_id}/{file_id}",
        headers=headers,
        timeout=120,
        follow_redirects=True,
    )
    dl_resp.raise_for_status()

    # ── 4. Parse CSV dan cari kolom NDVI ─────────────────────────────────────
    text = dl_resp.text
    if not text.strip():
        logger.warning("File CSV dari APPEEARS kosong")
        return None

    reader   = csv_module.DictReader(io.StringIO(text))
    fieldnames = reader.fieldnames or []
    logger.info(f"Kolom CSV APPEEARS: {fieldnames}")

    # Cari kolom NDVI secara fleksibel
    ndvi_col = None
    for pattern in NDVI_COLUMN_PATTERNS:
        ndvi_col = next((k for k in fieldnames if pattern in k), None)
        if ndvi_col:
            logger.info(f"Kolom NDVI ditemukan: '{ndvi_col}'")
            break

    if ndvi_col is None:
        # Coba cari kolom numerik yang nilainya di range MODIS NDVI (0–10000 atau 0.0–1.0)
        logger.warning(
            f"Kolom NDVI tidak ditemukan dengan pola {NDVI_COLUMN_PATTERNS}.\n"
            f"Kolom tersedia: {fieldnames}\n"
            f"Mencoba deteksi kolom numerik otomatis..."
        )
        # Baca baris pertama untuk cek nilai
        first_row = next(iter(reader), None)
        if first_row:
            for k, v in first_row.items():
                try:
                    fv = float(v)
                    # MODIS NDVI raw: -3000 s/d 10000; normalized: 0.0–1.0
                    if -3000 <= fv <= 10000 and k not in ("Latitude", "Longitude", "latitude", "longitude"):
                        ndvi_col = k
                        logger.info(f"Kolom NDVI terdeteksi otomatis: '{ndvi_col}' (nilai pertama: {fv})")
                        break
                except (ValueError, TypeError):
                    continue
        if ndvi_col is None:
            logger.warning(f"Tidak bisa mendeteksi kolom NDVI. Kolom: {fieldnames}")
            return None
        # Reset reader karena sudah kita konsumsi satu baris
        reader = csv_module.DictReader(io.StringIO(text))

    # ── 5. Kumpulkan nilai NDVI yang valid ────────────────────────────────────
    values = []
    for row in reader:
        raw = row.get(ndvi_col, "")
        try:
            val = float(raw)
            if val == -28672 or val < -3000:
                continue   # nilai fill MODIS
            # Jika nilai sudah di range 0–1, pakai langsung
            if 0.0 <= val <= 1.0:
                values.append(round(val, 4))
            # Jika masih raw MODIS (0–10000), bagi 10000
            elif 0 < val <= 10000:
                values.append(round(val / 10000.0, 4))
        except (ValueError, TypeError):
            continue

    if not values:
        logger.warning(
            f"Tidak ada nilai NDVI valid di kolom '{ndvi_col}'. "
            f"Kemungkinan lokasi tertutup awan atau data tidak tersedia untuk periode ini."
        )
        return None

    ndvi_mean = round(sum(values) / len(values), 4)
    logger.info(f"NDVI dari APPEEARS: {ndvi_mean} (dari {len(values)} nilai valid)")
    return ndvi_mean


# ── MAIN FETCH FUNCTION ────────────────────────────────
async def fetch_ndvi(
    lat: float,
    lon: float,
    days_back: int = 32,
    crop_type: str = "padi",
) -> dict:
    """
    Fetch NDVI real untuk satu lokasi dari NASA APPEEARS (MODIS MOD13Q1).

    Args:
        lat, lon   : Koordinat lahan
        days_back  : Periode ke belakang (MODIS 16-hari, minimal 32 hari agar dapat ≥1 composite)
        crop_type  : Dipakai hanya jika fallback ke estimasi musiman

    Returns:
        dict dengan keys:
          ndvi         : nilai NDVI (0.0–1.0)
          ndvi_source  : "modis_appeears" atau "seasonal_estimate"
          n_samples    : jumlah titik data yang dirata-rata (0 jika estimasi)
    """
    from data_fetcher import estimate_ndvi_from_season  # fallback

    end_dt   = datetime.today()
    start_dt = end_dt - timedelta(days=days_back)

    start_str = start_dt.strftime("%m-%d-%Y")
    end_str   = end_dt.strftime("%m-%d-%Y")
    task_name = f"panencerdas_{lat}_{lon}_{end_dt.strftime('%Y%m%d')}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # 1. Login
            token = await _get_token(client)

            # 2. Submit task
            task_id = await _submit_task(client, token, lat, lon, start_str, end_str, task_name)

            # 3. Tunggu selesai
            success = await _wait_for_task(client, token, task_id)
            if not success:
                raise RuntimeError("Task APPEEARS tidak selesai dalam batas waktu")

            # 4. Download & parse
            ndvi = await _download_ndvi(client, token, task_id)
            if ndvi is None:
                raise RuntimeError("Gagal mengambil nilai NDVI dari hasil APPEEARS")

        return {
            "ndvi":        ndvi,
            "ndvi_source": "modis_appeears",
            "n_samples":   1,  # rata-rata dari periode
            "lat":         lat,
            "lon":         lon,
        }

    except Exception as e:
        logger.warning(f"APPEEARS gagal untuk ({lat}, {lon}): {e} — pakai estimasi musiman")
        ndvi_estimated = estimate_ndvi_from_season(lat, lon, crop_type)
        return {
            "ndvi":        ndvi_estimated,
            "ndvi_source": "seasonal_estimate",
            "n_samples":   0,
            "lat":         lat,
            "lon":         lon,
        }


def fetch_ndvi_sync(
    lat: float,
    lon: float,
    days_back: int = 32,
    crop_type: str = "padi",
) -> dict:
    """Versi synchronous dari fetch_ndvi."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(
                    asyncio.run,
                    fetch_ndvi(lat, lon, days_back, crop_type)
                )
                return future.result(timeout=700)  # 10 menit + buffer
        else:
            return loop.run_until_complete(fetch_ndvi(lat, lon, days_back, crop_type))
    except Exception as e:
        logger.warning(f"fetch_ndvi_sync error: {e}")
        from data_fetcher import estimate_ndvi_from_season
        return {
            "ndvi":        estimate_ndvi_from_season(lat, lon, crop_type),
            "ndvi_source": "seasonal_estimate",
            "n_samples":   0,
            "lat":         lat,
            "lon":         lon,
        }


# ── BULK FETCH untuk TRAINING DATA ─────────────────────
async def fetch_ndvi_bulk(locations: list[dict], days_back: int = 32) -> list[dict]:
    """
    Fetch NDVI untuk banyak lokasi sekaligus.
    APPEEARS tidak membatasi concurrent task, tapi kita batasi 5 sekaligus
    agar tidak kena rate limit.

    Args:
        locations: list of {"lat": float, "lon": float, "crop_type": str}

    Returns:
        list of dict hasil fetch_ndvi per lokasi (urutan sama dengan input)
    """
    semaphore = asyncio.Semaphore(5)

    async def _fetch_one(loc: dict) -> dict:
        async with semaphore:
            result = await fetch_ndvi(
                loc["lat"], loc["lon"],
                days_back=days_back,
                crop_type=loc.get("crop_type", "padi"),
            )
            return result

    tasks   = [_fetch_one(loc) for loc in locations]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    output = []
    for loc, res in zip(locations, results):
        if isinstance(res, Exception):
            from data_fetcher import estimate_ndvi_from_season
            output.append({
                "ndvi":        estimate_ndvi_from_season(loc["lat"], loc["lon"], loc.get("crop_type", "padi")),
                "ndvi_source": "seasonal_estimate",
                "n_samples":   0,
                "lat":         loc["lat"],
                "lon":         loc["lon"],
            })
        else:
            output.append(res)

    return output


# ── INTEGRASI DENGAN data_cache.py ─────────────────────
async def get_or_fetch_ndvi(
    lat: float,
    lon: float,
    db,
    crop_type: str = "padi",
    days_back: int = 32,
    force_refresh: bool = False,
) -> dict:
    """
    Helper utama: coba ambil NDVI dari cache dulu (TTL 24 jam),
    jika miss → fetch dari APPEEARS → simpan ke cache.

    Struktur cache sama dengan climate cache — disimpan di tabel
    climate_cache dengan key yang mengandung prefix "ndvi_".
    """
    import json
    from datetime import timedelta
    from data_cache import get_cached_climate, save_climate_cache

    # Pakai period_days=0 sebagai penanda "ini data NDVI bukan iklim"
    # Cache key dibedakan lewat lat/lon rounded yang sama, period_days=-1
    NDVI_PERIOD_SENTINEL = -1

    if not force_refresh:
        cached = get_cached_climate(db, lat, lon, period_days=NDVI_PERIOD_SENTINEL)
        if cached and "ndvi" in cached:
            logger.debug(f"NDVI cache HIT untuk ({lat}, {lon})")
            return cached

    # Fetch dari APPEEARS
    result = await fetch_ndvi(lat, lon, days_back=days_back, crop_type=crop_type)

    # Simpan ke cache (TTL 24 jam — NDVI berubah perlahan)
    if result.get("ndvi_source") == "modis_appeears":
        save_climate_cache(
            db, lat, lon,
            data=result,
            period_days=NDVI_PERIOD_SENTINEL,
            ttl_hours=24,
        )

    return result


# ── PATCH fetch_bulk_for_training ──────────────────────
async def fetch_bulk_for_training_with_ndvi(
    locations: list[dict],
    days_back: int = 90,
) -> list[dict]:
    """
    Versi upgrade dari data_fetcher.fetch_bulk_for_training yang menyertakan
    NDVI real dari APPEEARS (bukan estimasi musiman).

    Gunakan fungsi ini di fetch_historical.py sebagai pengganti fetch_bulk_for_training.

    Args:
        locations: list of {"lat", "lon", "crop_type", "provinsi", "land_area_ha"}

    Returns:
        list of dict siap pakai sebagai training data (sama struktur dengan versi lama)
    """
    from data_fetcher import fetch_bulk_for_training, INDONESIA_DEFAULTS

    # Fetch iklim (suhu, hujan, radiasi) — seperti sebelumnya
    climate_rows = await fetch_bulk_for_training(locations, days_back=days_back)

    # Fetch NDVI real secara parallel
    logger.info(f"Fetching NDVI real untuk {len(locations)} lokasi dari APPEEARS...")
    ndvi_results = await fetch_ndvi_bulk(locations, days_back=32)

    # Gabungkan
    combined = []
    for climate_row, ndvi_result in zip(climate_rows, ndvi_results):
        row = {**climate_row}
        row["ndvi"]        = ndvi_result["ndvi"]
        row["ndvi_source"] = ndvi_result["ndvi_source"]
        combined.append(row)

        logger.info(
            f"  ({climate_row['lat']}, {climate_row['lon']}) "
            f"NDVI={ndvi_result['ndvi']} [{ndvi_result['ndvi_source']}]"
        )

    return combined


# ── CLI TEST ───────────────────────────────────────────
if __name__ == "__main__":
    import json
    import argparse

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--debug-bundle", metavar="TASK_ID",
        help="Print isi bundle mentah dari task_id tertentu (untuk debugging)"
    )
    args = parser.parse_args()

    async def debug_bundle(task_id: str):
        """Print isi bundle mentah — pakai ini jika masih error untuk lihat struktur aslinya."""
        print(f"\n🔍 Debug bundle untuk task_id: {task_id}\n")
        async with httpx.AsyncClient(timeout=30) as client:
            token = await _get_token(client)
            resp  = await client.get(
                f"{APPEEARS_BASE}/bundle/{task_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            resp.raise_for_status()
            bundle = resp.json()
            print("=== FULL BUNDLE RESPONSE ===")
            print(json.dumps(bundle, indent=2))

            files = bundle.get("files", [])
            if isinstance(files, dict):
                files = [{"file_id": fid, **fdata} for fid, fdata in files.items()]
            print(f"\n=== {len(files)} FILE(S) DITEMUKAN ===")
            for f in files:
                print(f"  file_id   : {f.get('file_id', f.get('id', '?'))}")
                print(f"  file_name : {f.get('file_name', f.get('name', '?'))}")
                print(f"  file_type : {f.get('file_type', '?')}")
                print(f"  file_size : {f.get('file_size', '?')}")
                print()

    async def main():
        print("🌿 Test fetch NDVI dari NASA APPEEARS\n")
        print("Pastikan APPEEARS_USER dan APPEEARS_PASS sudah diset di .env\n")

        test_locations = [
            {"lat": -7.25,  "lon": 112.75, "crop_type": "padi",   "label": "Surabaya, Jawa Timur"},
            {"lat": -6.90,  "lon": 107.60, "crop_type": "padi",   "label": "Bandung, Jawa Barat"},
            {"lat": -5.14,  "lon": 119.43, "crop_type": "jagung", "label": "Makassar, Sulawesi Selatan"},
        ]

        for loc in test_locations:
            print(f"📍 {loc['label']} ({loc['lat']}, {loc['lon']})")
            result = await fetch_ndvi(loc["lat"], loc["lon"], days_back=64, crop_type=loc["crop_type"])
            print(f"   NDVI         : {result['ndvi']}")
            print(f"   Sumber       : {result['ndvi_source']}")
            print(f"   Jumlah sample: {result['n_samples']}")
            print()

    if args.debug_bundle:
        asyncio.run(debug_bundle(args.debug_bundle))
    else:
        asyncio.run(main())