"""
data_cache.py
-------------
Cache hasil fetch iklim ke database lokal (SQLite/PostgreSQL).
Mencegah fetch berulang ke NASA POWER untuk koordinat yang sama.

TTL (Time-To-Live):
  - Data iklim       : 6 jam (cukup untuk prediksi harian)
  - Data historis    : 24 jam
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import Column, Integer, Float, String, DateTime, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from database import engine, SessionLocal  # pakai engine yang sudah ada di database.py

logger = logging.getLogger(__name__)

TTL_HOURS_CLIMATE   = 6
TTL_HOURS_HISTORICAL = 24


# ── MODEL TABEL CACHE ──────────────────────────────────
class CacheBase(DeclarativeBase):
    pass


class ClimateCache(CacheBase):
    """Cache data iklim per koordinat."""
    __tablename__ = "climate_cache"

    id           = Column(Integer, primary_key=True, index=True)
    lat          = Column(Float, nullable=False)
    lon          = Column(Float, nullable=False)
    lat_rounded  = Column(Float, nullable=False)  # dibulatkan 2 desimal untuk key lookup
    lon_rounded  = Column(Float, nullable=False)
    data_json    = Column(Text, nullable=False)    # hasil fetch sebagai JSON string
    data_source  = Column(String(30), nullable=False)
    period_days  = Column(Integer, nullable=False, default=30)
    fetched_at   = Column(DateTime, default=datetime.utcnow)
    expires_at   = Column(DateTime, nullable=False)


def init_cache():
    """Buat tabel cache jika belum ada."""
    CacheBase.metadata.create_all(bind=engine)
    logger.info("✅ Cache table siap")


# ── GET FROM CACHE ─────────────────────────────────────
def get_cached_climate(
    db: Session,
    lat: float,
    lon: float,
    period_days: int = 30,
) -> Optional[dict]:
    """
    Ambil data iklim dari cache jika masih valid (belum expired).
    Koordinat dibulatkan 2 desimal (~1.1 km presisi) untuk mengurangi duplikasi.

    Returns:
        dict data iklim atau None jika tidak ada / sudah expired
    """
    lat_r = round(lat, 2)
    lon_r = round(lon, 2)
    now   = datetime.utcnow()

    cached = (
        db.query(ClimateCache)
        .filter(
            ClimateCache.lat_rounded == lat_r,
            ClimateCache.lon_rounded == lon_r,
            ClimateCache.period_days == period_days,
            ClimateCache.expires_at  > now,
        )
        .order_by(ClimateCache.fetched_at.desc())
        .first()
    )

    if cached:
        logger.debug(f"Cache HIT untuk ({lat_r}, {lon_r})")
        return json.loads(cached.data_json)

    logger.debug(f"Cache MISS untuk ({lat_r}, {lon_r})")
    return None


# ── SAVE TO CACHE ──────────────────────────────────────
def save_climate_cache(
    db: Session,
    lat: float,
    lon: float,
    data: dict,
    period_days: int = 30,
    ttl_hours: int = TTL_HOURS_CLIMATE,
) -> ClimateCache:
    """Simpan data iklim ke cache dengan TTL."""
    lat_r = round(lat, 2)
    lon_r = round(lon, 2)
    now   = datetime.utcnow()

    # Hapus cache lama untuk koordinat ini (bersihkan duplikasi)
    db.query(ClimateCache).filter(
        ClimateCache.lat_rounded == lat_r,
        ClimateCache.lon_rounded == lon_r,
        ClimateCache.period_days == period_days,
    ).delete(synchronize_session="fetch")

    cache_entry = ClimateCache(
        lat=lat,
        lon=lon,
        lat_rounded=lat_r,
        lon_rounded=lon_r,
        data_json=json.dumps(data),
        data_source=data.get("data_source", "unknown"),
        period_days=period_days,
        fetched_at=now,
        expires_at=now + timedelta(hours=ttl_hours),
    )

    db.add(cache_entry)
    db.commit()
    db.refresh(cache_entry)
    logger.info(f"Cache SAVED untuk ({lat_r}, {lon_r}), expires in {ttl_hours}h")
    return cache_entry


# ── FETCH WITH CACHE (main helper) ────────────────────
async def get_or_fetch_climate(
    lat: float,
    lon: float,
    db: Session,
    period_days: int = 30,
    force_refresh: bool = False,
) -> dict:
    """
    Helper utama: coba ambil dari cache dulu, jika miss → fetch dari NASA POWER → simpan ke cache.

    Args:
        lat, lon: koordinat lahan
        db: database session
        period_days: periode historis dalam hari
        force_refresh: paksa fetch ulang meskipun cache masih valid

    Returns:
        dict data iklim dengan keys: temperature_c, rainfall_mm, solar_radiation, data_source
    """
    from data_fetcher import fetch_climate_data  # import di sini untuk hindari circular

    # Cek cache dulu
    if not force_refresh:
        cached = get_cached_climate(db, lat, lon, period_days)
        if cached:
            return cached

    # Fetch dari NASA POWER
    data = await fetch_climate_data(lat, lon, period_days)

    # Simpan ke cache (skip jika sumber adalah fallback default)
    if data.get("data_source") != "default_fallback":
        save_climate_cache(db, lat, lon, data, period_days)

    return data


def get_or_fetch_climate_sync(
    lat: float,
    lon: float,
    db: Session,
    period_days: int = 30,
    force_refresh: bool = False,
) -> dict:
    """Versi synchronous dari get_or_fetch_climate."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(
                    asyncio.run,
                    get_or_fetch_climate(lat, lon, db, period_days, force_refresh)
                )
                return future.result(timeout=35)
        else:
            return loop.run_until_complete(
                get_or_fetch_climate(lat, lon, db, period_days, force_refresh)
            )
    except Exception as e:
        logger.warning(f"get_or_fetch_climate_sync error: {e}")
        from data_fetcher import INDONESIA_DEFAULTS
        return {**INDONESIA_DEFAULTS, "data_source": "default_fallback"}


# ── CLEANUP ────────────────────────────────────────────
def cleanup_expired_cache(db: Session) -> int:
    """Hapus entri cache yang sudah expired. Jalankan periodik."""
    deleted = (
        db.query(ClimateCache)
        .filter(ClimateCache.expires_at < datetime.utcnow())
        .delete(synchronize_session="fetch")
    )
    db.commit()
    logger.info(f"Cache cleanup: {deleted} entri expired dihapus")
    return deleted


def get_cache_stats(db: Session) -> dict:
    """Statistik cache untuk endpoint /model/info."""
    total   = db.query(ClimateCache).count()
    active  = db.query(ClimateCache).filter(ClimateCache.expires_at > datetime.utcnow()).count()
    expired = total - active
    return {"total": total, "active": active, "expired": expired}
