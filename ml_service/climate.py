"""NASA POWER daily climate fetcher with on-disk cache.

Replaces the hardcoded `rainfall=180.0, temperature=27.5, solar=210.0`
constants in `_heuristic_predict()` when a request supplies lat + lon
but no explicit climate values.

API: https://power.larc.nasa.gov/api/temporal/daily/point
No auth required. Free, public, ~5s response on first call.

Parameters fetched:
  PRECTOTCORR        - corrected daily precipitation, mm/day
  T2M                - air temperature at 2m, degrees C
  ALLSKY_SFC_SW_DWN  - all-sky surface shortwave downward, MJ/m2/day

Heuristic + XGBoost expects (per the frontend form labels):
  rainfall_mm      - weekly aggregate, mm
  temperature_c    - daily mean, C
  solar_radiation  - 24h-averaged W/m2

Conversions inside _summarise().
"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from pathlib import Path

import requests

from ml_service.core.config import DATA_DIR

CACHE_DIR = DATA_DIR / "cache" / "power"
ENDPOINT = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETERS = "PRECTOTCORR,T2M,ALLSKY_SFC_SW_DWN"
LOOKBACK_DAYS = 30
CACHE_TTL_SECONDS = 24 * 3600  # one day
REQUEST_TIMEOUT_S = 8

# NASA missing-value sentinel
MISSING_SENTINEL = -100.0


def _cache_path(lat: float, lon: float) -> Path:
    return CACHE_DIR / f"{round(lat, 2):.2f}_{round(lon, 2):.2f}.json"


def _fetch_raw(lat: float, lon: float) -> dict | None:
    end = date.today() - timedelta(days=2)  # data lags ~1-2 days
    start = end - timedelta(days=LOOKBACK_DAYS)
    params = {
        "parameters": PARAMETERS,
        "start": start.strftime("%Y%m%d"),
        "end": end.strftime("%Y%m%d"),
        "latitude": f"{lat:.4f}",
        "longitude": f"{lon:.4f}",
        "community": "AG",
        "format": "JSON",
    }
    try:
        resp = requests.get(ENDPOINT, params=params, timeout=REQUEST_TIMEOUT_S)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        print(f"[climate] NASA POWER fetch failed for ({lat},{lon}): {exc}")
        return None


def _summarise(raw: dict) -> dict | None:
    try:
        block = raw["properties"]["parameter"]
        rains = [v for v in block["PRECTOTCORR"].values() if v > MISSING_SENTINEL]
        temps = [v for v in block["T2M"].values() if v > MISSING_SENTINEL]
        solars = [v for v in block["ALLSKY_SFC_SW_DWN"].values() if v > MISSING_SENTINEL]
    except (KeyError, TypeError):
        return None

    if not rains or not temps or not solars:
        return None

    avg_rain_daily = sum(rains) / len(rains)          # mm / day
    avg_temp = sum(temps) / len(temps)                # degrees C
    avg_solar_mj = sum(solars) / len(solars)          # MJ / m2 / day

    return {
        # weekly aggregate matches the form input contract
        "rainfall_mm": round(avg_rain_daily * 7, 1),
        "temperature_c": round(avg_temp, 1),
        # MJ/m2/day -> W/m2 (24-h average): * 1e6 / 86400 ≈ * 11.574
        "solar_radiation": round(avg_solar_mj * 1_000_000 / 86_400, 1),
    }


def fetch_climate(lat: float, lon: float) -> dict | None:
    """Return {rainfall_mm, temperature_c, solar_radiation} or None on failure.

    Disk-cached 24h per (lat, lon) rounded to 2 decimal places.
    """
    cache_file = _cache_path(lat, lon)

    if cache_file.exists():
        try:
            age = datetime.now().timestamp() - cache_file.stat().st_mtime
            if age < CACHE_TTL_SECONDS:
                cached = json.loads(cache_file.read_text(encoding="utf-8"))
                summary = _summarise(cached)
                if summary is not None:
                    return summary
        except (OSError, json.JSONDecodeError):
            pass  # stale or corrupt cache, refetch

    raw = _fetch_raw(lat, lon)
    if raw is None:
        return None

    cache_file.parent.mkdir(parents=True, exist_ok=True)
    try:
        cache_file.write_text(json.dumps(raw), encoding="utf-8")
    except OSError as exc:
        print(f"[climate] cache write failed: {exc}")

    return _summarise(raw)
