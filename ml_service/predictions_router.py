"""
predictions_router.py
---------------------
Endpoints prediksi pangan per kecamatan untuk dashboard pemerintah.

Mekanisme (v2.5 — real model):
  - Tiap kecamatan punya centroid lat/lon + luas baku.
  - Saat request, untuk setiap kecamatan:
      1) fetch iklim dari NASA POWER (lewat data_cache; di-cache 6 jam),
      2) panggil model.predict() yang sudah di-train (saved_models/*.joblib),
      3) hitung surplus_pct = (yield_pred - base_yield) / base_yield * 100.
  - Jika model belum loaded atau fetch iklim gagal → fallback ke nilai
    baseline per komoditas + jitter kecil per kecamatan (supaya peta tidak
    seragam dan tetap demo-able offline).

NDVI series + backtest di endpoint detail masih synthetic (sine wave) —
ganti dengan ndvi_fetcher real terpisah saat GEE auth sudah siap.
"""

import asyncio
import hashlib
import logging
import math
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, PredictionLog
from data_cache import get_or_fetch_climate
from model import is_model_loaded, predict as ml_predict, BASE_YIELD
import kementan_data
import provinces_data
from schemas import (
    CropType,
    KecamatanDetail,
    KecamatanPrediction,
    NdviPoint,
    PredictInput,
    PredictionsResponse,
    YieldPoint,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


# DIY (Daerah Istimewa Yogyakarta) — pilot deployment region.
# Centroid + luas per kecamatan. lat/lon dipakai untuk fetch iklim NASA POWER.
# Luas baku ~ estimasi sawah/lahan sentra Kementan DIY; bukan angka resmi.
KECAMATAN_DATA: list[dict] = [
    # Sleman — sentra padi sawah DIY
    {"id": "3404130", "kabupaten": "Sleman",      "kecamatan": "Prambanan",
     "lat": -7.7700, "lon": 110.4920, "luas": 1800},
    {"id": "3404020", "kabupaten": "Sleman",      "kecamatan": "Berbah",
     "lat": -7.8140, "lon": 110.4500, "luas": 1100},
    # Bantul — sawah + hortikultura
    {"id": "3402100", "kabupaten": "Bantul",      "kecamatan": "Pajangan",
     "lat": -7.9200, "lon": 110.3030, "luas": 1200},
    {"id": "3402080", "kabupaten": "Bantul",      "kecamatan": "Imogiri",
     "lat": -7.9290, "lon": 110.3920, "luas": 1400},
    # Kulon Progo — sentra padi pesisir selatan
    {"id": "3401040", "kabupaten": "Kulon Progo", "kecamatan": "Wates",
     "lat": -7.8590, "lon": 110.1620, "luas": 1500},
    # Gunungkidul — palawija (jagung, ubi kayu) karena topografi karst
    {"id": "3403080", "kabupaten": "Gunungkidul", "kecamatan": "Playen",
     "lat": -7.9460, "lon": 110.5870, "luas": 2200},
    {"id": "3403140", "kabupaten": "Gunungkidul", "kecamatan": "Wonosari",
     "lat": -7.9720, "lon": 110.5980, "luas": 1900},
]


# ── NDVI ESTIMATOR ─────────────────────────────────────
# NDVI baseline per komoditas (rata-rata growing season, sumber: literatur
# remote sensing pertanian tropis & nilai default fallback domain knowledge).
_BASE_NDVI: dict[str, float] = {
    "padi":         0.62,   # padi irigasi: NDVI tinggi & stabil
    "jagung":       0.58,
    "kedelai":      0.55,
    "ubi_jalar":    0.60,
    "ubi_kayu":     0.65,   # siklus panjang, kanopi rapat
    "cabe_besar":   0.55,
    "cabe_rawit":   0.50,
    "bawang_merah": 0.45,   # daun kecil, kanopi rendah
    "bawang_putih": 0.45,
}


async def _ndvi_series_for_detail(
    lat: float,
    lon: float,
    crop_type: str,
    start: date,
    n_months: int,
    db: Session,
) -> tuple[list[NdviPoint], str]:
    """
    Series NDVI untuk endpoint detail.

    Strategi:
      1) Coba cache APPEEARS time-series (period_days=-2). Kalau hit → real.
      2) Kalau miss & APPEEARS creds tersedia → submit task background.
         Tapi karena 3-10 menit, untuk request ini fallback dulu.
      3) Selalu siap dengan synthetic estimator sebagai fallback.

    Returns: (list[NdviPoint], source) di mana source =
        "modis_appeears" | "seasonal_estimate".
    """
    try:
        from ndvi_fetcher import get_or_fetch_ndvi_series
    except ImportError:
        get_or_fetch_ndvi_series = None  # type: ignore

    # Coba ambil cache APPEEARS (non-blocking — kalau cache miss, fungsi
    # akan submit task ke APPEEARS yang lambat. Kita pakai force_refresh=False
    # dan tunggu cuma kalau cache HIT supaya request tetap responsif.)
    if get_or_fetch_ndvi_series is not None:
        try:
            from data_cache import get_cached_climate
            SERIES_PERIOD_SENTINEL = -2
            cached = get_cached_climate(db, lat, lon, period_days=SERIES_PERIOD_SENTINEL)
            if cached and cached.get("series"):
                points = [
                    NdviPoint(date=p["date"], ndvi=p["ndvi"])
                    for p in cached["series"]
                ]
                logger.info(
                    f"NDVI series HIT cache APPEEARS ({lat},{lon}): {len(points)} titik"
                )
                return points, "modis_appeears"
        except Exception as e:
            logger.warning(f"Cek cache NDVI series gagal: {e}")

    # Fallback: synthetic estimator
    return _estimate_ndvi_series_synthetic(lat, lon, crop_type, start, n_months), "seasonal_estimate"


def _estimate_ndvi_series_synthetic(
    lat: float,
    lon: float,
    crop_type: str,
    start: date,
    n_months: int,
) -> list[NdviPoint]:
    """
    Generate NDVI bulanan realistis untuk Indonesia.

    Sumber sinyal:
      - Baseline per komoditas (irigasi vs tadah hujan vs hortikultura)
      - Pola monsun Indonesia: NDVI puncak Mar-Mei (pasca puncak hujan
        Jan-Feb), trough Sep-Okt (puncak kemarau). Vegetasi lag ~1 bulan
        di belakang curah hujan.
      - Variasi inter-annual ~3 tahun (proxy siklus ENSO)
      - Jitter per-koordinat (hash deterministik) supaya tiap kecamatan
        punya pola unik tapi reproducible.

    Bukan data satelit real - APPEEARS/Sentinel-2 punya pipeline terpisah
    di ndvi_fetcher.py (butuh NASA Earthdata credentials + queue 1-5 menit
    per task, tidak feasible untuk endpoint sync). Estimator ini dipakai
    untuk visualisasi tren historis pada dashboard pemerintah.
    """
    base = _BASE_NDVI.get(crop_type, 0.55)

    # Deterministic per-location seed (kecamatan-stabil).
    loc_seed = int(
        hashlib.md5(f"{lat:.3f},{lon:.3f}".encode()).hexdigest()[:8], 16
    )

    series: list[NdviPoint] = []
    for i in range(n_months):
        d = start + timedelta(days=30 * i)
        month = d.month
        year  = d.year

        # Pola monsun: cos peak di bulan 4 (April), trough di bulan 10 (Okt)
        phase    = (month - 4) * math.pi / 6
        seasonal = 0.16 * math.cos(phase)

        # Variasi tahun (siklus ~3 tahun)
        annual = 0.05 * math.sin((year - 2018) * math.pi / 1.5)

        # Per-lokasi + per-bulan noise dari hash (deterministik)
        bit_shift = (i * 7) % 24
        loc_var   = ((loc_seed >> bit_shift) & 0xff) / 4000.0 - 0.032

        ndvi = base + seasonal + annual + loc_var
        ndvi = max(0.15, min(0.92, ndvi))  # clamp realistic range

        series.append(NdviPoint(date=d.isoformat(), ndvi=round(ndvi, 3)))

    return series


def _status_from_surplus(surplus_pct: float) -> str:
    if surplus_pct > 10:
        return "surplus"
    if surplus_pct > -10:
        return "cukup"
    if surplus_pct > -20:
        return "waspada"
    return "defisit"


def _fallback_yield(commodity: str, region_id: str) -> float:
    """Yield baseline + jitter deterministik per region saat ML tak tersedia."""
    base = BASE_YIELD.get(commodity, 5.0)
    # Jitter +- 15% berdasarkan hash id (stabil antar request).
    seed = sum(ord(c) for c in str(region_id))
    jitter = ((seed % 31) - 15) / 100.0
    return round(base * (1 + jitter), 2)


def _kementan_baseline_yield(province: str, commodity: str) -> float | None:
    """
    Rata-rata yield 3 tahun terakhir dari Kementan untuk provinsi+komoditas.
    Dipakai sebagai baseline surplus_pct yang lebih akurat dibanding
    BASE_YIELD nasional generik.
    """
    rows = kementan_data.trend(province, commodity)
    if not rows:
        return None
    last3 = rows[-3:] if len(rows) >= 3 else rows
    return sum(r["yield_ton_per_ha"] for r in last3) / len(last3)


async def _predict_one(
    row: dict,
    commodity: CropType,
    db: Session,
    use_model: bool,
    baseline_yield: float | None = None,
) -> KecamatanPrediction:
    """
    Prediksi 1 region (kecamatan ATAU provinsi). Region row schema:
        {id, kabupaten, kecamatan, lat, lon, luas}

    `baseline_yield` overrides national baseline untuk hitung surplus_pct.
    Dipakai mode provinsi dengan baseline yield Kementan 3 tahun terakhir.
    """
    base = baseline_yield if baseline_yield is not None else BASE_YIELD.get(commodity, 5.0)
    yield_pred: float
    src = "fallback"

    if use_model:
        try:
            climate = await get_or_fetch_climate(
                lat=row["lat"], lon=row["lon"], db=db, period_days=30,
            )
            data = PredictInput(
                crop_type=commodity,
                land_area_ha=row["luas"],
                rainfall_mm=climate["rainfall_mm"],
                temperature_c=climate["temperature_c"],
                solar_radiation=climate["solar_radiation"],
                ndvi=0.65,  # baseline tropis; NDVI real per-pixel butuh GEE
                pest_pressure=0.0,
                variety="Lokal",
            )
            result = ml_predict(data)
            yield_pred = round(result.yield_ton_per_ha, 2)
            src = result.model_source
        except Exception as e:
            logger.warning(f"predict {row['kecamatan']} gagal: {e} — pakai fallback")
            yield_pred = _fallback_yield(commodity, row["id"])
    else:
        yield_pred = _fallback_yield(commodity, row["id"])

    surplus_pct = round((yield_pred - base) / base * 100.0, 1)
    produksi = round(yield_pred * row["luas"])

    logger.debug(
        f"{row['kecamatan']}: yield={yield_pred} t/ha "
        f"(src={src}, base={base:.2f}, surplus={surplus_pct}%)"
    )

    return KecamatanPrediction(
        id=row["id"],
        kabupaten=row["kabupaten"],
        kecamatan=row["kecamatan"],
        yield_pred_ton_per_ha=yield_pred,
        luas_panen_ha=row["luas"],
        produksi_pred_ton=produksi,
        surplus_pct=surplus_pct,
        status=_status_from_surplus(surplus_pct),
    )


def _province_row(province: str, commodity: str) -> dict | None:
    """
    Bangun 'row' provinsi dengan centroid + luas_panen Kementan terbaru.
    Return None kalau provinsi tidak dikenal atau tidak ada data Kementan.
    """
    prov = provinces_data.get(province)
    if not prov:
        return None

    year = kementan_data.latest_year_for(prov.kementan_name, commodity)
    if year is None:
        # Provinsi dikenal tapi tidak punya data komoditas itu — pakai luas default
        luas = 1000.0
    else:
        trend = kementan_data.trend(prov.kementan_name, commodity)
        latest = next((t for t in trend if t["year"] == year), None)
        luas = latest["luas_panen_ha"] if latest else 1000.0

    return {
        "id":        f"PROV_{prov.code}",
        "kabupaten": prov.name,
        "kecamatan": "(Provinsi)",
        "lat":       prov.lat,
        "lon":       prov.lon,
        "luas":      luas,
    }


@router.get("", response_model=PredictionsResponse)
async def list_predictions(
    province: str = "DI Yogyakarta",
    commodity: CropType = "padi",
    season: str = "MT 2024-1",
    db: Session = Depends(get_db),
) -> PredictionsResponse:
    """
    Prediksi pangan per region.

    Mode:
      - DI Yogyakarta (pilot)  -> 7 kecamatan paralel
      - Provinsi lain          -> 1 row provincial-level (centroid + Kementan luas)
      - 'ALL' / 'INDONESIA'    -> 37 provinsi (skip DIY kecamatan, pakai DIY-prov)

    Surplus_pct dihitung vs rata-rata Kementan 3 tahun terakhir untuk provinsi
    itu (baseline lebih akurat dibanding angka nasional generik).
    """
    use_model = is_model_loaded()
    if not use_model:
        logger.warning("Model belum dimuat — fallback baseline aktif")

    prov_key = (province or "").strip().upper()

    # ── MODE 1: National view (semua provinsi sekaligus) ──
    if prov_key in ("ALL", "INDONESIA", "NASIONAL"):
        # Sequential await per-provinsi. Concurrent gather sempat dicoba tapi
        # menyebabkan kontensi pada `db` session (SQLAlchemy session bukan
        # async-safe untuk dipakai paralel). Karena tiap call fetch NDVI/climate
        # cache, total ~20-25s pada cache cold. Frontend lewat Express harus
        # punya timeout >= 30s (lihat backend-express/.env ML_TIMEOUT_MS).
        items = []
        for prov in provinces_data.all_provinces():
            row = _province_row(prov.name, commodity)
            if not row:
                continue
            baseline = _kementan_baseline_yield(prov.kementan_name, commodity)
            items.append(await _predict_one(row, commodity, db, use_model, baseline))
        return PredictionsResponse(
            province="Indonesia",
            commodity=commodity,
            season=season,
            items=items,
        )

    # ── MODE 2: DIY pilot (7 kecamatan) ───────────────────
    if provinces_data.is_diy(province):
        baseline = _kementan_baseline_yield("DAERAH ISTIMEWA YOGYAKARTA", commodity)
        tasks = [
            _predict_one(row, commodity, db, use_model, baseline)
            for row in KECAMATAN_DATA
        ]
        items = await asyncio.gather(*tasks)
        return PredictionsResponse(
            province=province,
            commodity=commodity,
            season=season,
            items=list(items),
        )

    # ── MODE 3: Provincial single row (selain DIY) ────────
    row = _province_row(province, commodity)
    if not row:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Provinsi '{province}' tidak dikenal. "
                f"Gunakan nama lengkap (e.g. 'Jawa Barat'), kode Kementan (e.g. '32'), "
                f"atau 'ALL' untuk semua provinsi."
            ),
        )
    baseline = _kementan_baseline_yield(province, commodity)
    pred = await _predict_one(row, commodity, db, use_model, baseline)
    return PredictionsResponse(
        province=province,
        commodity=commodity,
        season=season,
        items=[pred],
    )


@router.get("/history", summary="Riwayat prediksi petani")
def predictions_history(
    petani_id: str | None = None,
    lahan_id: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    Riwayat panggilan /api/predict.

    Filter:
      - `petani_id` -> hanya prediksi milik petani itu
      - `lahan_id`  -> hanya prediksi lahan itu (bisa dikombinasi dengan petani_id)
      - `limit`     -> max baris (default 50, clamp ke [1, 200])

    Diurutkan terbaru ke terlama.
    """
    limit = max(1, min(int(limit), 200))

    q = db.query(PredictionLog)
    if petani_id:
        q = q.filter(PredictionLog.petani_id == petani_id)
    if lahan_id:
        q = q.filter(PredictionLog.lahan_id == lahan_id)

    rows = q.order_by(PredictionLog.created_at.desc()).limit(limit).all()

    return {
        "petani_id": petani_id,
        "lahan_id":  lahan_id,
        "total":     len(rows),
        "items": [
            {
                "id":                    r.id,
                "petani_id":             r.petani_id,
                "lahan_id":              r.lahan_id,
                "crop_type":             r.crop_type,
                "land_area_ha":          r.land_area_ha,
                "ndvi":                  r.ndvi,
                "rainfall_mm":           r.rainfall_mm,
                "temperature_c":         r.temperature_c,
                "solar_radiation":       r.solar_radiation,
                "pred_harvest_days":     r.pred_harvest_days,
                "pred_yield_ton_per_ha": r.pred_yield_ton_per_ha,
                "pred_risk_level":       r.pred_risk_level,
                "confidence":            r.pred_confidence,
                "model_source":          r.model_source,
                "feedback_given":        r.feedback_given,
                "created_at":            r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


def _build_backtest(
    kementan_province_name: str,
    commodity: str,
    predicted_yield: float,
) -> list[YieldPoint]:
    """
    Backtest yield = data Kementan real per tahun (aktual) + prediksi tahun depan.

    - Aktual = yield Kementan provinsi 5 tahun terakhir (kalau data lengkap).
    - Prediksi = output model untuk tahun sesudahnya.

    Kalau Kementan tidak punya data, return list kosong supaya frontend bisa
    show empty state alih-alih grafik palsu.
    """
    trend = kementan_data.trend(kementan_province_name, commodity)
    if not trend:
        return []

    last5 = trend[-5:]
    points = [
        YieldPoint(year=r["year"], value=round(r["yield_ton_per_ha"], 2), kind="aktual")
        for r in last5
    ]
    next_year = last5[-1]["year"] + 1
    points.append(
        YieldPoint(year=next_year, value=round(predicted_yield, 2), kind="prediksi")
    )
    return points


@router.get("/{region_id}", response_model=KecamatanDetail)
async def get_detail(
    region_id: str,
    commodity: CropType = "padi",
    db: Session = Depends(get_db),
) -> KecamatanDetail:
    """
    Detail per region (kecamatan DIY ATAU provinsi).

    region_id format:
      - "34041xx"     -> kecamatan DIY (lookup KECAMATAN_DATA)
      - "PROV_<code>" -> provinsi (lookup provinces_data by Kementan code)
    """
    kementan_province_name: str
    row: dict | None = None

    if region_id.startswith("PROV_"):
        # Mode provinsi
        code = region_id.removeprefix("PROV_")
        prov = provinces_data.by_code(code)
        if not prov:
            raise HTTPException(
                status_code=404,
                detail=f"Provinsi kode '{code}' tidak ditemukan",
            )
        row = _province_row(prov.name, commodity)
        kementan_province_name = prov.kementan_name
    else:
        # Mode kecamatan DIY
        row = next((r for r in KECAMATAN_DATA if r["id"] == region_id), None)
        if not row:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Region '{region_id}' tidak ditemukan. "
                    f"Gunakan ID kecamatan DIY atau format 'PROV_<kode>'."
                ),
            )
        # Kecamatan DIY → backtest pakai Kementan provinsi DIY sebagai proxy
        kementan_province_name = "DAERAH ISTIMEWA YOGYAKARTA"

    if row is None:
        raise HTTPException(status_code=404, detail=f"Tidak bisa load region {region_id}")

    baseline = _kementan_baseline_yield(kementan_province_name, commodity)
    pred = await _predict_one(row, commodity, db, is_model_loaded(), baseline)

    # NDVI series 7 tahun. Cache APPEEARS HIT -> real MODIS, MISS -> estimator.
    # Pre-warm via scripts/prewarm_ndvi_cache.py untuk dapat data real.
    series, ndvi_source = await _ndvi_series_for_detail(
        lat=row["lat"],
        lon=row["lon"],
        crop_type=commodity,
        start=date(2018, 1, 1),
        n_months=84,
        db=db,
    )

    backtest = _build_backtest(
        kementan_province_name=kementan_province_name,
        commodity=commodity,
        predicted_yield=pred.yield_pred_ton_per_ha,
    )

    return KecamatanDetail(
        kecamatan=row["kecamatan"],
        kabupaten=row["kabupaten"],
        yield_pred_ton_per_ha=pred.yield_pred_ton_per_ha,
        luas_panen_ha=row["luas"],
        total_produksi_ton=pred.produksi_pred_ton,
        ndvi_series=series,
        ndvi_source=ndvi_source,
        backtest=backtest,
    )
