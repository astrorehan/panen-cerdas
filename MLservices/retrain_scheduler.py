# retrain_scheduler.py
"""
Retraining pipeline otomatis untuk PanenCerdas ML Service.

Cara kerja:
  1. Setiap 10 feedback baru masuk → trigger retrain
  2. Setiap hari Minggu jam 02.00 → scheduled retrain
  3. Setelah retrain → evaluasi: lebih baik atau tidak?
  4. Jika lebih baik → ganti model aktif
  5. Jika lebih buruk → pertahankan model lama (rollback)

Perbaikan v2.3:
  - Hapus FEATURES hardcode — baca dari feature_meta.joblib yang disimpan model.py
  - Hapus _load_synthetic_data, _load_real_data, _encode lokal yang duplikat logic
    dan tidak sinkron dengan model.py. Ganti dengan delegasi langsung ke model.py
  - _load_real_data lokal tidak membaca pest_pressure/variety dari DB
    (kolom belum ada di TrainingFeedback). Sekarang model.py yang handle ini
    secara terpusat via _load_training_data()
"""

import joblib
from pathlib import Path
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sqlalchemy.orm import Session

from database import (
    SessionLocal, get_unused_feedback, mark_feedback_used,
    get_feedback_count, save_model_version, get_latest_model_version,
)

MODEL_DIR = Path(__file__).parent / "saved_models"
FEATURE_META_PATH = MODEL_DIR / "feature_meta.joblib"

RETRAIN_THRESHOLD = 10

_scheduler = BackgroundScheduler()
_current_version = 1


# ── BACA FITUR AKTIF DARI feature_meta.joblib ──────────
def _get_active_features() -> list[str]:
    """
    Baca daftar fitur dari feature_meta.joblib yang ditulis model.py saat training.
    Fallback ke FEATURES_BASE jika file belum ada (model lama / belum pernah train).
    """
    from model import FEATURES_BASE  # import konstanta, bukan nilai hardcode lokal
    if FEATURE_META_PATH.exists():
        try:
            meta = joblib.load(FEATURE_META_PATH)
            return meta["features"]
        except Exception:
            pass
    return list(FEATURES_BASE)


# ── LOAD DATA GABUNGAN (delegasi ke model.py) ──────────
def _load_and_encode_data(db: Session, n_synthetic: int = 500):
    """
    Muat data training (real + synthetic) dan encode fitur.
    Sepenuhnya didelegasikan ke model.py agar logika encoding
    pest_pressure, variety, crop_type selalu konsisten.

    Returns:
        df_combined : DataFrame siap pakai
        n_real      : jumlah baris data nyata
        n_synthetic : jumlah baris data synthetic
    """
    import pandas as pd
    from model import (
        _load_real_data,
        _generate_synthetic_data,
        _encode_features,
    )

    real_df  = _load_real_data(db)
    n_real   = len(real_df)
    synth_df = _generate_synthetic_data(n_synthetic)

    if n_real > 0:
        # Duplikasi data nyata 3× agar bobotnya lebih besar dari synthetic
        df_real_weighted = pd.concat([real_df] * 3, ignore_index=True)
        df_combined = pd.concat([synth_df, df_real_weighted], ignore_index=True)
    else:
        df_combined = synth_df

    # Encode menggunakan fungsi model.py — encoder crop di-load dari disk
    encoder_path = MODEL_DIR / "crop_encoder.joblib"
    if not encoder_path.exists():
        raise FileNotFoundError("crop_encoder.joblib tidak ditemukan — jalankan train.py dulu")
    encoder = joblib.load(encoder_path)

    df_combined, _ = _encode_features(df_combined, crop_enc=encoder, fit=False)
    return df_combined, n_real, len(synth_df)


# ── CORE RETRAIN ───────────────────────────────────────
def retrain(force: bool = False, db: Session = None) -> dict:
    """
    Latih ulang model dengan data synthetic + feedback petani.
    Fitur yang dipakai disesuaikan otomatis dengan feature_meta.joblib.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # 1. Cek threshold
        counts = get_feedback_count(db)
        unused = counts["unused"]

        if not force and unused < RETRAIN_THRESHOLD:
            msg = f"Belum cukup data baru: {unused}/{RETRAIN_THRESHOLD}"
            print(f"⏭  Retrain dilewati — {msg}")
            return {"skipped": True, "reason": msg}

        print(f"\n🔄 Memulai retraining...")
        print(f"   Data nyata baru: {unused} feedback")

        # 2. Baca fitur aktif dari feature_meta — sinkron dengan model terlatih
        active_features = _get_active_features()
        print(f"   Fitur aktif    : {active_features}")

        # 3. Load & encode data (delegasi ke model.py)
        df_combined, n_real, n_synthetic = _load_and_encode_data(db, n_synthetic=500)

        print(f"   Data synthetic : {n_synthetic} baris")
        print(f"   Data nyata     : {n_real} baris")

        # 4. Validasi semua fitur tersedia di dataframe
        missing_cols = [f for f in active_features if f not in df_combined.columns]
        if missing_cols:
            raise ValueError(
                f"Kolom fitur tidak ditemukan di data: {missing_cols}. "
                f"Kolom tersedia: {list(df_combined.columns)}"
            )

        required_targets = ["harvest_days", "yield_ton_per_ha", "risk_level"]
        df_combined = df_combined.dropna(subset=active_features + required_targets)

        X  = df_combined[active_features]
        yh = df_combined["harvest_days"]
        yy = df_combined["yield_ton_per_ha"]
        yr = df_combined["risk_level"]

        print(f"   Total training rows: {len(df_combined)}")

        # 5. Split
        X_tr, X_te, yh_tr, yh_te, yy_tr, yy_te, yr_tr, yr_te = train_test_split(
            X, yh, yy, yr, test_size=0.2, random_state=42
        )

        # 6. Train model baru
        new_harvest = RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1)
        new_harvest.fit(X_tr, yh_tr)

        new_yield = RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1)
        new_yield.fit(X_tr, yy_tr)

        new_risk = RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=-1)
        new_risk.fit(X_tr, yr_tr)

        # 7. Evaluasi
        mae_h = mean_absolute_error(yh_te, new_harvest.predict(X_te))
        mae_y = mean_absolute_error(yy_te, new_yield.predict(X_te))
        acc_r = accuracy_score(yr_te, new_risk.predict(X_te))

        print(f"   [Baru] MAE harvest: {mae_h:.2f} hari | MAE yield: {mae_y:.3f} ton | Acc risk: {acc_r:.1%}")

        # 8. Bandingkan dengan model lama
        old_version    = get_latest_model_version(db)
        should_replace = True

        if old_version:
            old_mae_h = old_version.mae_harvest_days or 999
            old_acc_r = old_version.risk_accuracy or 0
            should_replace = (mae_h < old_mae_h * 1.05) or (acc_r > old_acc_r * 0.95)
            if should_replace:
                print("   ✅ Model baru lebih baik — mengganti model aktif")
            else:
                print("   ⚠️  Model lama lebih baik — rollback, tetap pakai model lama")

        # 9. Simpan jika lebih baik
        global _current_version
        result = {}

        if should_replace:
            MODEL_DIR.mkdir(exist_ok=True)
            joblib.dump(new_harvest, MODEL_DIR / "harvest_days_model.joblib")
            joblib.dump(new_yield,   MODEL_DIR / "yield_model.joblib")
            joblib.dump(new_risk,    MODEL_DIR / "risk_model.joblib")
            # feature_meta TIDAK ditimpa — fitur harus tetap sama dengan yang
            # dipakai saat train.py dijalankan. Ubah fitur hanya via train.py.

            _current_version += 1

            save_model_version(db, {
                "version":          _current_version,
                "mae_harvest_days": round(mae_h, 3),
                "mae_yield":        round(mae_y, 3),
                "risk_accuracy":    round(acc_r, 4),
                "n_synthetic":      n_synthetic,
                "n_real":           n_real,
                "notes":            f"Retrain dengan {n_real} data nyata | fitur: {active_features}",
            })

            from model import load_models
            load_models()

            unused_rows = get_unused_feedback(db)
            unused_ids  = [r.id for r in unused_rows]
            mark_feedback_used(db, unused_ids, _current_version)

            result = {
                "skipped":        False,
                "replaced":       True,
                "version":        _current_version,
                "mae_harvest":    round(mae_h, 3),
                "mae_yield":      round(mae_y, 3),
                "risk_accuracy":  round(acc_r, 4),
                "n_real_data":    n_real,
                "features_used":  active_features,
                "message":        f"Model v{_current_version} berhasil dilatih ({n_real} data nyata)",
            }
        else:
            unused_rows = get_unused_feedback(db)
            unused_ids  = [r.id for r in unused_rows]
            mark_feedback_used(db, unused_ids, old_version.version if old_version else 1)

            result = {
                "skipped":  False,
                "replaced": False,
                "message":  "Model lama dipertahankan karena lebih akurat",
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
    db = SessionLocal()
    try:
        counts = get_feedback_count(db)
        print(f"📊 Feedback check: {counts['unused']} baru / {counts['total']} total")
        if counts["unused"] >= RETRAIN_THRESHOLD:
            print("🎯 Threshold tercapai! Memulai retrain otomatis...")
            retrain(db=db)
    finally:
        db.close()


# ── SCHEDULED RETRAIN ──────────────────────────────────
def scheduled_weekly_retrain():
    print(f"\n⏰ Scheduled weekly retrain — {datetime.now()}")
    retrain(force=True)


# ── SCHEDULER SETUP ────────────────────────────────────
def start_scheduler():
    if _scheduler.running:
        return
    _scheduler.add_job(
        scheduled_weekly_retrain,
        trigger=CronTrigger(day_of_week="sun", hour=2, minute=0),
        id="weekly_retrain",
        replace_existing=True,
    )
    _scheduler.start()
    print("⏰ Retrain scheduler aktif (tiap Minggu 02.00 WIB)")


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        print("⏰ Scheduler dihentikan")
