"""
seed_feedback.py
----------------
Generate data laporan panen petani (TrainingFeedback) yang realistis untuk
7 kecamatan DIY, supaya dashboard pemerintah /pemerintah/analisis menampilkan
"yield aktual" di samping prediksi model.

Mekanisme:
  - Untuk tiap kecamatan, buat beberapa PredictionLog dengan lat/lon di centroid
    kecamatan (+ jitter kecil) — inilah yang dipakai predictions_router untuk
    memetakan feedback ke kecamatan (nearest centroid).
  - Tiap PredictionLog diikuti satu TrainingFeedback berisi yield panen NYATA
    (base yield komoditas + variasi acak, jadi ada yang surplus & defisit).

Semua baris seed ditandai lahan_id berawalan 'SEED-DIY-' supaya bisa di-reset
tanpa menyentuh data petani asli.

Run (dari folder ml_service):
    python scripts/seed_feedback.py                 # tambah ~4 laporan/kecamatan (padi)
    python scripts/seed_feedback.py --per 6         # 6 laporan/kecamatan
    python scripts/seed_feedback.py --all-crops     # padi + palawija (jagung/ubi_kayu)
    python scripts/seed_feedback.py --reset          # hapus semua data seed, lalu isi ulang
    python scripts/seed_feedback.py --reset-only     # hanya hapus data seed
"""

import argparse
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Windows console (cp1252) tidak bisa cetak emoji - paksa UTF-8.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = Path(__file__).resolve().parent
ML_SERVICE = HERE.parent
sys.path.insert(0, str(ML_SERVICE))

from dotenv import load_dotenv
load_dotenv(ML_SERVICE / ".env")

from database import SessionLocal, init_db, PredictionLog, TrainingFeedback  # noqa: E402
from predictions_router import KECAMATAN_DATA  # noqa: E402

SEED_PREFIX = "SEED-DIY-"

# Base yield + lama panen per komoditas (sinkron dengan model.BASE_YIELD /
# feedback_router._BASE_YIELDS). Dipakai sebagai titik tengah variasi acak.
CROP_PROFILE = {
    "padi":     {"base_yield": 5.2,  "base_days": 110, "solar": 18.0, "rain": 230.0},
    "jagung":   {"base_yield": 5.8,  "base_days": 100, "solar": 19.0, "rain": 180.0},
    "ubi_kayu": {"base_yield": 20.0, "base_days": 270, "solar": 19.0, "rain": 150.0},
}

# Komoditas per kecamatan (selain padi yang selalu ada). Mengikuti komentar
# di predictions_router: Gunungkidul = sentra palawija.
EXTRA_CROPS = {
    "3403080": ["jagung", "ubi_kayu"],   # Playen
    "3403140": ["jagung"],               # Wonosari
}


def _clear_seed(db) -> int:
    """Hapus semua PredictionLog + TrainingFeedback hasil seed (lahan_id SEED-DIY-*)."""
    seed_logs = (
        db.query(PredictionLog.id)
        .filter(PredictionLog.lahan_id.like(f"{SEED_PREFIX}%"))
        .all()
    )
    log_ids = [r[0] for r in seed_logs]

    n_fb = (
        db.query(TrainingFeedback)
        .filter(TrainingFeedback.lahan_id.like(f"{SEED_PREFIX}%"))
        .delete(synchronize_session=False)
    )
    if log_ids:
        db.query(TrainingFeedback).filter(
            TrainingFeedback.prediction_log_id.in_(log_ids)
        ).delete(synchronize_session=False)
    n_log = (
        db.query(PredictionLog)
        .filter(PredictionLog.lahan_id.like(f"{SEED_PREFIX}%"))
        .delete(synchronize_session=False)
    )
    db.commit()
    return n_log + n_fb


def _make_one(db, kec: dict, crop: str, idx: int) -> None:
    """Buat 1 PredictionLog (dengan GPS) + 1 TrainingFeedback untuk kecamatan ini."""
    prof = CROP_PROFILE[crop]

    # Koordinat di sekitar centroid kecamatan (~ +-1 km) supaya jatuh ke
    # kecamatan yang benar saat nearest-centroid mapping.
    lat = kec["lat"] + random.uniform(-0.01, 0.01)
    lon = kec["lon"] + random.uniform(-0.01, 0.01)

    land_area = round(random.uniform(0.4, 2.5), 2)
    rainfall = round(prof["rain"] * random.uniform(0.85, 1.15), 1)
    temp = round(random.uniform(25.5, 28.5), 1)
    solar = round(prof["solar"] * random.uniform(0.92, 1.08), 1)
    ndvi = round(random.uniform(0.45, 0.72), 3)

    # Yield prediksi model (titik tengah) vs yield aktual (ground truth petani).
    pred_yield = round(prof["base_yield"] * random.gauss(1.0, 0.08), 2)
    actual_yield = round(prof["base_yield"] * random.gauss(1.0, 0.13), 2)
    actual_yield = max(round(prof["base_yield"] * 0.55, 2), actual_yield)

    pred_days = int(prof["base_days"] * random.uniform(0.95, 1.05))
    actual_days = int(prof["base_days"] * random.uniform(0.95, 1.08))

    ratio = actual_yield / prof["base_yield"]
    risk = "low" if ratio >= 0.85 else ("medium" if ratio >= 0.65 else "high")

    created = datetime.utcnow() - timedelta(days=random.randint(2, 120))
    lahan_id = f"{SEED_PREFIX}{kec['id']}-{crop}-{idx}"

    log = PredictionLog(
        ndvi=ndvi,
        rainfall_mm=rainfall,
        temperature_c=temp,
        solar_radiation=solar,
        land_area_ha=land_area,
        crop_type=crop,
        pred_harvest_days=pred_days,
        pred_yield_ton_per_ha=pred_yield,
        pred_risk_level=risk,
        pred_confidence=round(random.uniform(0.78, 0.95), 2),
        model_source="ml_model",
        petani_id=None,            # FK auth.users - biarkan NULL untuk data demo
        lahan_id=lahan_id,
        lat=lat,
        lon=lon,
        created_at=created,
        feedback_given=True,
    )
    db.add(log)
    db.flush()  # dapatkan log.id untuk referensi feedback

    fb = TrainingFeedback(
        prediction_log_id=log.id,
        ndvi=ndvi,
        rainfall_mm=rainfall,
        temperature_c=temp,
        solar_radiation=solar,
        land_area_ha=land_area,
        crop_type=crop,
        actual_harvest_days=actual_days,
        actual_yield_ton_per_ha=actual_yield,
        actual_risk_level=risk,
        pest_pressure=round(random.uniform(0.0, 0.3), 2),
        variety="Lokal",
        petani_id=None,
        lahan_id=lahan_id,
        catatan="(data demo seed)",
        created_at=created,
        used_in_training=False,
    )
    db.add(fb)


def main() -> None:
    ap = argparse.ArgumentParser(description="Seed laporan panen petani untuk dashboard DIY")
    ap.add_argument("--per", type=int, default=4, help="Jumlah laporan padi per kecamatan (default 4)")
    ap.add_argument("--all-crops", action="store_true", help="Tambah palawija (jagung/ubi_kayu) di Gunungkidul")
    ap.add_argument("--reset", action="store_true", help="Hapus data seed lama sebelum isi ulang")
    ap.add_argument("--reset-only", action="store_true", help="Hanya hapus data seed, tidak isi ulang")
    ap.add_argument("--seed", type=int, default=42, help="Random seed (reproducible)")
    args = ap.parse_args()

    random.seed(args.seed)
    init_db()
    db = SessionLocal()
    try:
        if args.reset or args.reset_only:
            removed = _clear_seed(db)
            print(f"[reset] Hapus {removed} baris data seed lama.")
            if args.reset_only:
                return

        total = 0
        for kec in KECAMATAN_DATA:
            crops = ["padi"]
            if args.all_crops:
                crops += EXTRA_CROPS.get(kec["id"], [])

            for crop in crops:
                # padi dapat --per laporan; palawija setengahnya (min 2).
                n = args.per if crop == "padi" else max(2, args.per // 2)
                for i in range(n):
                    _make_one(db, kec, crop, i)
                    total += 1
            print(f"  + {kec['kecamatan']:<12} ({kec['kabupaten']}): {', '.join(crops)}")

        db.commit()
        print(f"\n[ok] {total} laporan panen petani ditambahkan untuk {len(KECAMATAN_DATA)} kecamatan DIY.")
        print("     Buka /pemerintah/analisis (komoditas padi) untuk melihat yield aktual.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
