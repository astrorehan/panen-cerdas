"""
main.py
-------
PanenCerdas ML Service — versi dengan real data (NASA POWER + APPEEARS NDVI) + online learning.

Perubahan dari v2.1:
  - POST /predict: jika lat/lon dikirim, fetch NDVI real dari APPEEARS (via cache 24 jam)
    di samping data iklim dari NASA POWER (via cache 6 jam)
  - Response /predict: tambah field ndvi_source
  - GET /health & /model/info: tampilkan ndvi_source stats (opsional)
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn

from schemas import PredictInput, PredictOutput, HealthResponse
from model import load_models, is_model_loaded, predict
from database import (
    init_db, get_db, save_prediction_log,
    get_feedback_count, get_latest_model_version
)
from data_cache import init_cache, get_or_fetch_climate, get_cache_stats, cleanup_expired_cache
from ndvi_fetcher import get_or_fetch_ndvi
from feedback_router import router as feedback_router
from retrain_scheduler import start_scheduler, stop_scheduler, retrain

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── LIFESPAN ───────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n🌾 PanenCerdas ML Service starting...")
    init_db()
    init_cache()
    loaded = load_models()
    if not loaded:
        print("⚠️  Model belum ada — jalankan: python train.py")
    start_scheduler()
    print("✅ ML Service siap di http://localhost:8000\n")
    yield
    stop_scheduler()
    print("👋 ML Service shutdown")


# ── APP ────────────────────────────────────────────────
app = FastAPI(
    title="PanenCerdas ML Service",
    version="2.2.0",
    description="Prediksi panen dengan ML + data iklim NASA POWER + NDVI real MODIS APPEEARS",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(feedback_router)


# ── ROUTES ─────────────────────────────────────────────
@app.get("/", tags=["info"])
def root():
    return {
        "service":  "PanenCerdas ML Service",
        "version":  "2.2.0",
        "docs":     "/docs",
        "features": [
            "ml_prediction",
            "real_climate_data_nasa_power",
            "real_ndvi_modis_appeears",
            "online_learning",
            "auto_retrain",
        ],
    }


@app.get("/health", response_model=HealthResponse, tags=["info"])
def health(db: Session = Depends(get_db)):
    ver = get_latest_model_version(db)
    fb  = get_feedback_count(db)
    cs  = get_cache_stats(db)
    return HealthResponse(
        status="ok",
        model_loaded=is_model_loaded(),
        service="PanenCerdas ML Service",
        version=f"v{ver.version}" if ver else "v1 (synthetic only)",
        feedback_stats=fb,
        cache_stats=cs,
    )


@app.post("/predict", response_model=PredictOutput, tags=["prediction"])
async def predict_harvest(
    data: PredictInput,
    petani_id: str = None,
    lahan_id: str = None,
    db: Session = Depends(get_db),
):
    """
    Prediksi panen.

    Jika field `lat` dan `lon` diisi:
      → Data iklim (suhu, hujan, radiasi) diambil dari NASA POWER (cache 6 jam)
      → NDVI diambil dari NASA APPEEARS/MODIS (cache 24 jam)
      → Semua nilai iklim + NDVI dari request body di-override
      → Jika APPEEARS tidak tersedia, NDVI fallback ke estimasi musiman

    Jika `lat`/`lon` tidak diisi:
      → Pakai semua nilai dari request body langsung (termasuk ndvi)

    Response menyertakan:
      - `prediction_log_id`  : simpan untuk lapor hasil panen via POST /feedback
      - `climate_source`     : sumber data iklim (nasa_power / user_input / default_fallback)
      - `ndvi_source`        : sumber NDVI (modis_appeears / seasonal_estimate / user_input)
    """
    climate_source = "user_input"
    ndvi_source    = "user_input"

    try:
        if data.lat is not None and data.lon is not None:
            # Fetch iklim dan NDVI secara parallel agar lebih cepat
            import asyncio
            climate_task = get_or_fetch_climate(
                lat=data.lat, lon=data.lon, db=db, period_days=30
            )
            ndvi_task = get_or_fetch_ndvi(
                lat=data.lat, lon=data.lon, db=db,
                crop_type=data.crop_type, days_back=32
            )
            climate, ndvi_result = await asyncio.gather(climate_task, ndvi_task)

            # Override nilai iklim
            data.temperature_c   = climate["temperature_c"]
            data.rainfall_mm     = climate["rainfall_mm"]
            data.solar_radiation = climate["solar_radiation"]
            climate_source       = climate.get("data_source", "nasa_power")

            # Override NDVI
            data.ndvi  = ndvi_result["ndvi"]
            ndvi_source = ndvi_result["ndvi_source"]

            logger.info(
                f"Data di-override dari sumber real: "
                f"iklim={climate_source} | "
                f"NDVI={data.ndvi} [{ndvi_source}] | "
                f"suhu={data.temperature_c}°C | hujan={data.rainfall_mm}mm"
            )

        result = predict(data)

        # Simpan ke prediction_log
        log = save_prediction_log(
            db,
            input_data={
                **data.model_dump(),
                "petani_id": petani_id,
                "lahan_id":  lahan_id,
            },
            output_data=result.model_dump(),
        )

        result_dict = result.model_dump()
        result_dict["prediction_log_id"] = log.id
        result_dict["climate_source"]    = climate_source
        result_dict["ndvi_source"]       = ndvi_source
        return result_dict

    except Exception as e:
        logger.error(f"Predict error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/retrain", tags=["admin"])
def trigger_retrain(force: bool = False, db: Session = Depends(get_db)):
    """
    Trigger retrain manual.
    force=true: retrain meskipun jumlah feedback belum mencapai threshold.
    """
    return retrain(force=force, db=db)


@app.get("/model/info", tags=["admin"])
def model_info(db: Session = Depends(get_db)):
    ver = get_latest_model_version(db)
    fb  = get_feedback_count(db)
    cs  = get_cache_stats(db)
    unused    = fb.get("unused", 0)
    threshold = 10

    return {
        "model_loaded":   is_model_loaded(),
        "active_version": ver.version if ver else None,
        "trained_at":     ver.trained_at.isoformat() if ver else None,
        "metrics": {
            "mae_harvest_days": ver.mae_harvest_days if ver else None,
            "mae_yield":        ver.mae_yield        if ver else None,
            "risk_accuracy":    ver.risk_accuracy    if ver else None,
        },
        "training_data": {
            "n_synthetic": ver.n_synthetic if ver else None,
            "n_real":      ver.n_real      if ver else None,
        },
        "feedback_pool": fb,
        "climate_cache": cs,
        "next_retrain":  f"Perlu {max(0, threshold - unused)} feedback lagi untuk auto-retrain",
        "data_sources": {
            "climate": "NASA POWER (suhu, hujan, radiasi) — cache 6 jam",
            "ndvi":    "NASA APPEEARS MODIS MOD13Q1 — cache 24 jam, fallback ke estimasi musiman",
        },
    }


@app.delete("/cache/expired", tags=["admin"])
def clear_expired_cache(db: Session = Depends(get_db)):
    deleted = cleanup_expired_cache(db)
    return {"deleted": deleted, "message": f"{deleted} entri cache expired dihapus"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
