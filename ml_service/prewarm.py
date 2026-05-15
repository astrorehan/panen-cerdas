"""
prewarm.py
----------
Reusable background prewarmer untuk NDVI cache (NASA APPEEARS MODIS MOD13Q1).

Berbeda dari `scripts/prewarm_ndvi_cache.py` (CLI), modul ini di-import oleh
`main.py` saat FastAPI start. Kalau env var `PREWARM_NDVI_ON_STARTUP=true`,
prewarm dijadwalkan sebagai `asyncio.create_task` — non-blocking, ml_service
tetap menerima request sambil cache di-fill di background.

Target koordinat = sama dengan CLI:
  - 7 kecamatan DIY (pilot)
  - 36 provinsi centroid (skip code 34 karena sudah di-cover DIY kecamatan)

Mode default = single-point NDVI (period_days=-1, TTL 24 jam). Time-series
(period_days=-2, TTL 7 hari) bisa diaktifkan via env `PREWARM_NDVI_SERIES=true`
tapi jauh lebih lama (~30-50 menit di koneksi normal).

Env:
  PREWARM_NDVI_ON_STARTUP  default "false". Set "true" untuk auto-run saat boot.
  PREWARM_NDVI_SERIES      default "false". Set "true" untuk juga prewarm
                           time-series 2018-2025 (jauh lebih lama).
  PREWARM_NDVI_CONCURRENCY default "3". Jumlah task APPEEARS paralel.
  PREWARM_NDVI_DIY_ONLY    default "false". Set "true" untuk hanya 7 kecamatan
                           DIY (mempercepat demo lokal).
"""

import asyncio
import logging
import os

logger = logging.getLogger("prewarm")


def _truthy(env_name: str, default: bool = False) -> bool:
    val = os.getenv(env_name, "").strip().lower()
    if not val:
        return default
    return val in ("1", "true", "yes", "on")


async def _prewarm_single(sem, db, name, lat, lon, crop_type, force):
    from ndvi_fetcher import get_or_fetch_ndvi
    async with sem:
        try:
            result = await get_or_fetch_ndvi(
                lat=lat, lon=lon, db=db,
                crop_type=crop_type, days_back=32,
                force_refresh=force,
            )
            return (name, result["ndvi_source"], result["ndvi"])
        except Exception as e:
            logger.warning(f"  prewarm single GAGAL {name}: {e}")
            return (name, "error", None)


async def _prewarm_series(sem, db, name, lat, lon, force):
    from ndvi_fetcher import get_or_fetch_ndvi_series
    async with sem:
        try:
            result = await get_or_fetch_ndvi_series(
                lat=lat, lon=lon, db=db,
                start_year=2018, end_year=2025,
                force_refresh=force,
            )
            n = len(result.get("series", []))
            return (name, result.get("ndvi_source", "error"), n)
        except Exception as e:
            logger.warning(f"  prewarm series GAGAL {name}: {e}")
            return (name, "error", 0)


def _collect_targets(diy_only: bool):
    """Return list of (name, lat, lon, crop_type)."""
    targets: list[tuple[str, float, float, str]] = []

    from predictions_router import KECAMATAN_DATA
    for k in KECAMATAN_DATA:
        targets.append((
            f"DIY-{k['kecamatan']}",
            k["lat"], k["lon"], "padi",
        ))

    if not diy_only:
        import provinces_data
        for p in provinces_data.all_provinces():
            if p.code == "34":   # DIY sudah di-cover via KECAMATAN_DATA
                continue
            targets.append((
                f"PROV-{p.name}",
                p.lat, p.lon, "padi",
            ))

    return targets


async def run_prewarm(
    *,
    diy_only: bool = False,
    with_series: bool = False,
    concurrency: int = 3,
    force: bool = False,
) -> dict:
    """
    Jalankan prewarm NDVI cache. Aman dipanggil dari FastAPI startup atau CLI.

    Returns ringkasan dict supaya pemanggil bisa log hasil.
    """
    if not os.getenv("APPEEARS_USER") or not os.getenv("APPEEARS_PASS"):
        logger.warning(
            "Prewarm NDVI dibatalkan: APPEEARS_USER / APPEEARS_PASS belum di-set "
            "di .env. Cache akan terisi alami saat request masuk (lebih lambat per "
            "request pertama)."
        )
        return {"ok": False, "reason": "no_appeears_creds"}

    from database import SessionLocal
    db = SessionLocal()
    summary = {
        "ok": True,
        "single_modis": 0,
        "single_estimate": 0,
        "single_error": 0,
        "series_modis": 0,
        "series_error": 0,
        "n_targets": 0,
    }

    try:
        targets = _collect_targets(diy_only)
        summary["n_targets"] = len(targets)
        if not targets:
            logger.info("Prewarm: tidak ada target — skip.")
            return summary

        logger.info(
            f"Prewarm NDVI start (background): {len(targets)} koordinat, "
            f"concurrency={concurrency}, with_series={with_series}, force={force}"
        )

        sem = asyncio.Semaphore(concurrency)

        # ── PASS 1: single-point ─────────────────────────────
        tasks = [
            _prewarm_single(sem, db, name, lat, lon, crop_type, force)
            for name, lat, lon, crop_type in targets
        ]
        completed = 0
        for fut in asyncio.as_completed(tasks):
            name, source, ndvi = await fut
            completed += 1
            if source == "modis_appeears":
                summary["single_modis"] += 1
            elif source == "seasonal_estimate":
                summary["single_estimate"] += 1
            else:
                summary["single_error"] += 1
            if completed % 5 == 0 or completed == len(targets):
                logger.info(
                    f"Prewarm single-point: {completed}/{len(targets)} "
                    f"(modis={summary['single_modis']}, "
                    f"estimate={summary['single_estimate']}, "
                    f"error={summary['single_error']})"
                )

        # ── PASS 2: time-series (opsional) ───────────────────
        if with_series:
            sem2 = asyncio.Semaphore(concurrency)
            tasks = [
                _prewarm_series(sem2, db, name, lat, lon, force)
                for name, lat, lon, _crop in targets
            ]
            completed = 0
            for fut in asyncio.as_completed(tasks):
                name, source, n_points = await fut
                completed += 1
                if source == "modis_appeears":
                    summary["series_modis"] += 1
                else:
                    summary["series_error"] += 1
                if completed % 5 == 0 or completed == len(targets):
                    logger.info(
                        f"Prewarm series: {completed}/{len(targets)} "
                        f"(modis={summary['series_modis']}, "
                        f"error={summary['series_error']})"
                    )

        logger.info(f"Prewarm NDVI selesai: {summary}")
        return summary
    finally:
        db.close()


def start_background_prewarm() -> asyncio.Task | None:
    """
    Dipanggil dari main.lifespan(). Cek env var dan schedule task non-blocking.

    Return:
        Task yang berjalan di background, atau None kalau di-skip.
    """
    if not _truthy("PREWARM_NDVI_ON_STARTUP", default=False):
        logger.info(
            "Prewarm NDVI off (set PREWARM_NDVI_ON_STARTUP=true di .env untuk "
            "auto-prewarm saat boot)."
        )
        return None

    diy_only    = _truthy("PREWARM_NDVI_DIY_ONLY", default=False)
    with_series = _truthy("PREWARM_NDVI_SERIES",   default=False)
    try:
        concurrency = max(1, int(os.getenv("PREWARM_NDVI_CONCURRENCY", "3")))
    except ValueError:
        concurrency = 3

    logger.info(
        f"Prewarm NDVI dijadwalkan sebagai background task "
        f"(diy_only={diy_only}, with_series={with_series}, concurrency={concurrency})"
    )

    async def _runner():
        try:
            await run_prewarm(
                diy_only=diy_only,
                with_series=with_series,
                concurrency=concurrency,
            )
        except Exception as e:
            logger.exception(f"Prewarm NDVI crash: {e}")

    return asyncio.create_task(_runner(), name="ndvi-prewarm")
