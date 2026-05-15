# retrain_scheduler.py
"""
Retraining pipeline otomatis untuk PanenCerdas ML Service.

Cara kerja:
  1. Setiap 10 feedback baru masuk → trigger retrain
  2. Setiap hari Minggu jam 02.00 → scheduled retrain
  3. Setelah retrain → evaluasi: lebih baik atau tidak?
  4. Jika lebih baik → ganti model aktif
  5. Jika lebih buruk → pertahankan model lama (rollback)
"""

import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedShuffleSplit
from sklearn.metrics import mean_absolute_error, accuracy_score
from sqlalchemy.orm import Session

from database import (
    SessionLocal, get_unused_feedback, mark_feedback_used,
    get_feedback_count, save_model_version, get_latest_model_version,
    TrainingFeedback
)

MODEL_DIR = Path(__file__).parent / "saved_models"

# Harus identik dengan model.py — update keduanya jika ada perubahan
CROP_TYPES = [
    "bawang_merah",
    "bawang_putih",
    "cabe_besar",
    "cabe_rawit",
    "jagung",
    "kedelai",
    "padi",
    "ubi_jalar",
    "ubi_kayu",
]

# Fitur base — pest & variety ditambahkan dinamis dari feature_meta
FEATURES_BASE = ["ndvi", "rainfall_mm", "temperature_c",
                 "solar_radiation", "land_area_ha", "crop_encoded"]

# Minimum data nyata sebelum retrain
RETRAIN_THRESHOLD = 10

# Scheduler instance
_scheduler = BackgroundScheduler()
_current_version = 1


# ── LOAD DATA SYNTHETIC ────────────────────────────────
def _load_synthetic_data(n: int = 500) -> pd.DataFrame:
    """
    Load versi ringkas data synthetic sebagai base.
    Dikurangi ke 500 agar data nyata punya bobot lebih besar.
    Pakai _generate_synthetic_data dari model.py (nama fungsi v2.4).
    """
    from model import _generate_synthetic_data
    return _generate_synthetic_data(n)


# ── LOAD DATA NYATA DARI DB ────────────────────────────
def _load_real_data(db: Session) -> pd.DataFrame:
    """Ambil semua feedback dari petani sebagai data training nyata."""
    rows = db.query(TrainingFeedback).all()
    if not rows:
        return pd.DataFrame()

    records = []
    for r in rows:
        risk = r.actual_risk_level
        if risk not in ["low", "medium", "high"]:
            risk = "medium"
        records.append({
            "ndvi":             r.ndvi,
            "rainfall_mm":      r.rainfall_mm,
            "temperature_c":    r.temperature_c,
            "solar_radiation":  r.solar_radiation,
            "land_area_ha":     r.land_area_ha,
            "crop_type":        r.crop_type,
            "harvest_days":     r.actual_harvest_days,
            "yield_ton_per_ha": r.actual_yield_ton_per_ha,
            "risk_level":       risk,
            # Kolom tambahan — pakai getattr agar aman dengan DB lama
            # yang belum punya kolom ini
            "pest_pressure":    getattr(r, "pest_pressure", 0.0) or 0.0,
            "variety":          getattr(r, "variety", "Lokal") or "Lokal",
        })
    return pd.DataFrame(records)


# ── ENCODE ─────────────────────────────────────────────
def _encode(df: pd.DataFrame, encoder) -> pd.DataFrame:
    """
    Encode crop_type + crop_group + pest_pressure + variety
    sesuai feature_meta yang disimpan saat train.py dijalankan.
    Konsisten dengan model.py _encode_features().
    """
    from model import CROP_GROUP, CROP_GROUP_ENCODER, ALL_VARIETIES, VARIETY_ENCODER

    df = df.copy()

    # Fallback crop_type tidak dikenal → "padi"
    df["crop_type"] = df["crop_type"].apply(
        lambda x: x if x in CROP_TYPES else "padi"
    )
    df["crop_encoded"] = encoder.transform(df["crop_type"])

    # crop_group (pangan / umbi / hortikultura)
    df["crop_group"] = df["crop_type"].map(CROP_GROUP).fillna("pangan")
    df["crop_group_encoded"] = CROP_GROUP_ENCODER.transform(df["crop_group"])

    # yield_ratio — normalisasi lintas komoditas
    from model import BASE_YIELD
    if "yield_ton_per_ha" in df.columns:
        df["yield_ratio"] = df.apply(
            lambda r: r["yield_ton_per_ha"] / max(BASE_YIELD.get(r["crop_type"], 5.0), 0.01),
            axis=1,
        ).clip(0.1, 2.0)

    # pest_pressure
    if "pest_pressure" not in df.columns:
        df["pest_pressure"] = 0.0
    df["pest_pressure"] = df["pest_pressure"].fillna(0.0).clip(0.0, 1.0)

    # variety_encoded
    if "variety" not in df.columns:
        df["variety"] = "Lokal"
    df["variety"] = df["variety"].fillna("Lokal")
    known = set(ALL_VARIETIES)
    df["variety"] = df["variety"].apply(lambda v: v if v in known else "Lokal")
    df["variety_encoded"] = VARIETY_ENCODER.transform(df["variety"])

    return df


# ── CORE RETRAIN ────────────────────────────────────────
def retrain(force: bool = False, db: Session = None) -> dict:
    """
    Latih ulang model dengan menggabungkan:
      - Data synthetic (base knowledge)
      - Data nyata dari petani (ground truth)

    Return dict dengan hasil evaluasi.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # 1. Cek apakah ada cukup data baru
        counts = get_feedback_count(db)
        unused = counts["unused"]

        if not force and unused < RETRAIN_THRESHOLD:
            msg = f"Belum cukup data baru: {unused}/{RETRAIN_THRESHOLD}"
            print(f"⏭  Retrain dilewati — {msg}")
            return {"skipped": True, "reason": msg}

        print(f"\n🔄 Memulai retraining...")
        print(f"   Data nyata baru: {unused} feedback")

        # 2. Load encoder + feature_meta dari model yang sudah di-train
        encoder_path      = MODEL_DIR / "crop_encoder.joblib"
        feature_meta_path = MODEL_DIR / "feature_meta.joblib"

        if not encoder_path.exists():
            raise FileNotFoundError("Encoder tidak ditemukan — jalankan train.py dulu")

        encoder = joblib.load(encoder_path)

        # Baca feature_meta untuk tahu fitur apa yang dipakai model aktif
        if feature_meta_path.exists():
            feature_meta  = joblib.load(feature_meta_path)
            harvest_feats = feature_meta.get("harvest_features", FEATURES_BASE)
            yield_feats   = feature_meta.get("yield_features",   FEATURES_BASE)
            risk_feats    = feature_meta.get("risk_features",    FEATURES_BASE)
            use_pest      = feature_meta.get("use_pest",    False)
            use_variety   = feature_meta.get("use_variety", False)
            yield_norm    = feature_meta.get("yield_normalized", False)
        else:
            # Fallback ke fitur base jika feature_meta belum ada
            harvest_feats = yield_feats = risk_feats = FEATURES_BASE
            use_pest = use_variety = yield_norm = False

        # 3. Gabungkan data synthetic + nyata
        df_synthetic = _load_synthetic_data(n=500)
        df_real      = _load_real_data(db)

        n_synthetic = len(df_synthetic)
        n_real      = len(df_real)

        print(f"   Data synthetic : {n_synthetic} baris")
        print(f"   Data nyata     : {n_real} baris")

        if n_real > 0:
            # Duplikasi data nyata 3x agar bobotnya lebih besar
            df_real_weighted = pd.concat([df_real] * 3, ignore_index=True)
            df_combined = pd.concat([df_synthetic, df_real_weighted], ignore_index=True)
        else:
            df_combined = df_synthetic

        df_combined = _encode(df_combined, encoder)
        df_combined = df_combined.dropna(
            subset=["ndvi", "rainfall_mm", "temperature_c", "solar_radiation",
                    "land_area_ha", "crop_encoded",
                    "harvest_days", "yield_ton_per_ha", "risk_level"]
        )

        # yield_ratio untuk yield & risk model
        from model import BASE_YIELD
        df_combined["yield_ratio"] = df_combined.apply(
            lambda r: r["yield_ton_per_ha"] / max(BASE_YIELD.get(r["crop_type"], 5.0), 0.01),
            axis=1,
        ).clip(0.1, 2.0)

        # Buat X per model — hanya kolom yang benar-benar ada di dataframe
        def _safe_cols(wanted: list, df: pd.DataFrame) -> list:
            return [c for c in wanted if c in df.columns]

        X_harvest = df_combined[_safe_cols(harvest_feats, df_combined)]
        X_yield   = df_combined[_safe_cols(yield_feats,   df_combined)]
        X_risk    = df_combined[_safe_cols(risk_feats,    df_combined)]
        yh = df_combined["harvest_days"]
        yy = df_combined["yield_ton_per_ha"]
        yr = df_combined["risk_level"]

        # yield_ratio sebagai target yield model (sama dengan train.py)
        yy_ratio = df_combined["yield_ratio"]

        print(f"   Total training rows: {len(df_combined)}")
        print(f"   Fitur harvest : {list(X_harvest.columns)}")
        print(f"   Fitur yield   : {list(X_yield.columns)}")
        print(f"   Fitur risk    : {list(X_risk.columns)}")

        # 4. Split train/test (stratified by risk agar distribusi seimbang)
        from sklearn.model_selection import StratifiedShuffleSplit
        sss = StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
        train_idx, test_idx = next(sss.split(X_harvest, yr))

        # 5. Train model baru — arsitektur sama dengan train.py
        new_harvest = RandomForestRegressor(
            n_estimators=200, random_state=42, n_jobs=-1
        )
        new_harvest.fit(X_harvest.iloc[train_idx], yh.iloc[train_idx])

        new_yield = RandomForestRegressor(
            n_estimators=200, max_features="sqrt", random_state=42, n_jobs=-1
        )
        # Train dengan yield_ratio agar lintas komoditas sebanding
        new_yield.fit(X_yield.iloc[train_idx], yy_ratio.iloc[train_idx])

        new_risk = RandomForestClassifier(
            n_estimators=300, class_weight="balanced",
            max_depth=12, min_samples_leaf=3,
            random_state=42, n_jobs=-1
        )
        new_risk.fit(X_risk.iloc[train_idx], yr.iloc[train_idx])

        # 6. Evaluasi model baru
        mae_h = mean_absolute_error(
            yh.iloc[test_idx],
            new_harvest.predict(X_harvest.iloc[test_idx])
        )
        # Yield: prediksi ratio → rekonstruksi ton/ha untuk MAE bermakna
        pred_ratio  = new_yield.predict(X_yield.iloc[test_idx])
        test_crops  = df_combined["crop_type"].iloc[test_idx].values
        pred_yield  = [pred_ratio[i] * BASE_YIELD.get(test_crops[i], 5.0)
                       for i in range(len(pred_ratio))]
        mae_y = mean_absolute_error(yy.iloc[test_idx].values, pred_yield)

        acc_r = accuracy_score(
            yr.iloc[test_idx],
            new_risk.predict(X_risk.iloc[test_idx])
        )

        print(f"   [Baru] MAE harvest: {mae_h:.2f} hari | "
              f"MAE yield: {mae_y:.3f} ton/ha | Acc risk: {acc_r:.1%}")

        # 7. Bandingkan dengan model lama
        old_version = get_latest_model_version(db)
        should_replace = True

        if old_version:
            old_mae_h = old_version.mae_harvest_days or 999
            old_acc_r = old_version.risk_accuracy or 0
            # Ganti hanya jika harvest MAE lebih baik ATAU risk acc lebih baik
            should_replace = (mae_h < old_mae_h * 1.05) or (acc_r > old_acc_r * 0.95)
            if should_replace:
                print(f"   ✅ Model baru lebih baik — mengganti model aktif")
            else:
                print(f"   ⚠️  Model lama lebih baik — rollback, tetap pakai model lama")

        # 8. Simpan model baru jika lebih baik
        global _current_version
        result = {}

        if should_replace:
            MODEL_DIR.mkdir(exist_ok=True)
            joblib.dump(new_harvest, MODEL_DIR / "harvest_days_model.joblib")
            joblib.dump(new_yield,   MODEL_DIR / "yield_model.joblib")
            joblib.dump(new_risk,    MODEL_DIR / "risk_model.joblib")

            _current_version += 1

            # Simpan versi ke DB
            save_model_version(db, {
                "version":          _current_version,
                "mae_harvest_days": round(mae_h, 3),
                "mae_yield":        round(mae_y, 3),
                "risk_accuracy":    round(acc_r, 4),
                "n_synthetic":      n_synthetic,
                "n_real":           n_real,
                "notes":            f"Retrain dengan {n_real} data nyata dari petani",
            })

            # Reload model di memory
            from model import load_models
            load_models()

            # Tandai feedback sebagai sudah dipakai
            unused_rows = get_unused_feedback(db)
            unused_ids  = [r.id for r in unused_rows]
            mark_feedback_used(db, unused_ids, _current_version)

            result = {
                "skipped":       False,
                "replaced":      True,
                "version":       _current_version,
                "mae_harvest":   round(mae_h, 3),
                "mae_yield":     round(mae_y, 3),
                "risk_accuracy": round(acc_r, 4),
                "n_real_data":   n_real,
                "message":       f"Model v{_current_version} berhasil dilatih dengan {n_real} data nyata"
            }
        else:
            # Tetap tandai feedback dipakai agar tidak diproses ulang
            unused_rows = get_unused_feedback(db)
            unused_ids  = [r.id for r in unused_rows]
            mark_feedback_used(db, unused_ids, old_version.version if old_version else 1)

            result = {
                "skipped":   False,
                "replaced":  False,
                "message":   "Model lama dipertahankan karena lebih akurat",
            }

        print(f"✅ Retraining selesai: {result['message']}")
        return result

    except Exception as e:
        print(f"❌ Retrain gagal: {e}")
        return {"skipped": False, "replaced": False, "error": str(e)}
    finally:
        if close_db:
            db.close()


# ── CHECK THRESHOLD ────────────────────────────────────
def check_and_retrain_if_needed():
    """
    Dipanggil setiap kali ada feedback baru masuk.
    Cek apakah sudah cukup data untuk retrain.
    """
    db = SessionLocal()
    try:
        counts = get_feedback_count(db)
        print(f"📊 Feedback check: {counts['unused']} baru / {counts['total']} total")
        if counts["unused"] >= RETRAIN_THRESHOLD:
            print("🎯 Threshold tercapai! Memulai retrain otomatis...")
            retrain(db=db)
    finally:
        db.close()


# ── SCHEDULED RETRAIN (TIAP MINGGU) ───────────────────
def scheduled_weekly_retrain():
    """Retrain terjadwal tiap Minggu jam 02.00 — dipaksa meski belum threshold."""
    print(f"\n⏰ Scheduled weekly retrain — {datetime.now()}")
    retrain(force=True)


# ── SCHEDULER SETUP ────────────────────────────────────
def start_scheduler():
    """Mulai scheduler background. Dipanggil saat FastAPI startup."""
    if _scheduler.running:
        return

    # Job terjadwal: tiap Minggu jam 02.00
    _scheduler.add_job(
        scheduled_weekly_retrain,
        trigger=CronTrigger(day_of_week="sun", hour=2, minute=0),
        id="weekly_retrain",
        replace_existing=True,
    )

    _scheduler.start()
    print("⏰ Retrain scheduler aktif (tiap Minggu 02.00 WIB)")


def stop_scheduler():
    """Hentikan scheduler saat FastAPI shutdown."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        print("⏰ Scheduler dihentikan")
