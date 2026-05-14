# database.py
"""
Database layer untuk PanenCerdas ML Service.
Menggunakan SQLite untuk development (zero-config).
Ganti DATABASE_URL ke PostgreSQL saat production.
"""

import os
import uuid as _uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    Column, Integer, Float, String, DateTime,
    Boolean, Text, ForeignKey, Table, Uuid, create_engine, text
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

# ── CONFIG ─────────────────────────────────────────────
# Default        : Supabase Postgres (multi-device).
# Fallback offline: SQLite anchored ke folder ml_service/ (untuk dev tanpa internet).
#   sqlite:///<absolute>/panencerdas_ml.db  → set DATABASE_URL=sqlite:///./local.db
#   Uuid columns degrade ke CHAR(32) di SQLite (no FK ke auth.users).

_DEFAULT_DB_PATH = Path(__file__).resolve().parent / "panencerdas_ml.db"

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{_DEFAULT_DB_PATH.as_posix()}"
)

# SQLite perlu flag tambahan untuk async safety
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,          # set True untuk debug SQL
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


# ── BASE MODEL ─────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# Supabase auth.users — kita FK ke sini dari petani_id, tapi tidak boleh
# di-create oleh init_db() (managed oleh Supabase Auth). Declarasi reflection-like
# supaya SQLAlchemy bisa resolve target FK. Di-exclude dari create_all().
auth_users = Table(
    "users",
    Base.metadata,
    Column("id", Uuid(as_uuid=False), primary_key=True),
    schema="auth",
)


# ── TABEL 1: prediction_log ────────────────────────────
# Menyimpan setiap request /predict beserta hasilnya
class PredictionLog(Base):
    __tablename__ = "prediction_log"

    id               = Column(Integer, primary_key=True, index=True)
    # Input dari petani
    ndvi             = Column(Float, nullable=False)
    rainfall_mm      = Column(Float, nullable=False)
    temperature_c    = Column(Float, nullable=False)
    solar_radiation  = Column(Float, nullable=False)
    land_area_ha     = Column(Float, nullable=False)
    crop_type        = Column(String(20), nullable=False)
    # Output prediksi model
    pred_harvest_days     = Column(Integer, nullable=False)
    pred_yield_ton_per_ha = Column(Float,   nullable=False)
    pred_risk_level       = Column(String(10), nullable=False)
    pred_confidence       = Column(Float, nullable=False)
    model_source          = Column(String(20), nullable=False)
    # Metadata
    # petani_id: UUID Supabase auth.users(id). FK aktif di Postgres; di SQLite
    # SQLAlchemy degrade ke CHAR(32) tanpa FK (auth.users tidak ada).
    petani_id        = Column(
        Uuid(as_uuid=False),
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    lahan_id         = Column(String(50), nullable=True, index=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    # Feedback (diisi nanti setelah panen)
    feedback_given   = Column(Boolean, default=False)


# ── TABEL 2: training_feedback ─────────────────────────
# Ground truth dari petani — hasil panen NYATA
# Inilah yang dipakai untuk retrain model
class TrainingFeedback(Base):
    __tablename__ = "training_feedback"

    id                    = Column(Integer, primary_key=True, index=True)
    # Referensi ke prediction_log
    prediction_log_id     = Column(Integer, nullable=True)
    # Input kondisi lahan (sama seperti saat predict)
    ndvi                  = Column(Float, nullable=False)
    rainfall_mm           = Column(Float, nullable=False)
    temperature_c         = Column(Float, nullable=False)
    solar_radiation       = Column(Float, nullable=False)
    land_area_ha          = Column(Float, nullable=False)
    crop_type             = Column(String(20), nullable=False)
    # Hasil NYATA dari petani (ground truth)
    actual_harvest_days   = Column(Integer,  nullable=False)
    actual_yield_ton_per_ha = Column(Float,  nullable=False)
    actual_risk_level     = Column(String(10), nullable=False)
    # Fitur tambahan model v2.4 — opsional untuk kompatibilitas DB lama
    pest_pressure         = Column(Float, nullable=True, default=0.0)
    variety               = Column(String(50), nullable=True, default="Lokal")
    # Metadata
    petani_id             = Column(
        Uuid(as_uuid=False),
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    lahan_id              = Column(String(50), nullable=True, index=True)
    catatan               = Column(Text, nullable=True)   # Catatan bebas petani
    created_at            = Column(DateTime, default=datetime.utcnow)
    used_in_training      = Column(Boolean, default=False)  # Sudah dipakai retrain?
    training_version      = Column(Integer, nullable=True)  # Versi model yang pakai data ini


# ── TABEL 3: model_version ─────────────────────────────
# Riwayat versi model — untuk rollback jika perlu
class ModelVersion(Base):
    __tablename__ = "model_version"

    id               = Column(Integer, primary_key=True, index=True)
    version          = Column(Integer, nullable=False, unique=True)
    trained_at       = Column(DateTime, default=datetime.utcnow)
    # Metrik performa
    mae_harvest_days = Column(Float, nullable=True)
    mae_yield        = Column(Float, nullable=True)
    risk_accuracy    = Column(Float, nullable=True)
    # Info data
    n_synthetic      = Column(Integer, nullable=True)  # Jumlah data synthetic
    n_real           = Column(Integer, nullable=True)  # Jumlah data nyata dari petani
    # Status
    is_active        = Column(Boolean, default=False)
    notes            = Column(Text, nullable=True)


# ── INIT DB ────────────────────────────────────────────
def init_db():
    """Buat semua tabel jika belum ada. Exclude tabel di schema 'auth'
    karena itu di-manage oleh Supabase (auth.users)."""
    owned = [t for t in Base.metadata.sorted_tables if t.schema != "auth"]
    Base.metadata.create_all(bind=engine, tables=owned)
    print("[OK] Database & tabel siap")


# ── SESSION HELPER ─────────────────────────────────────
def get_db() -> Session:
    """Dependency injection untuk FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def normalize_petani_id(value) -> Optional[str]:
    """Coerce ke UUID string yang valid; kalau bukan UUID return None.

    Kolom petani_id di-FK ke auth.users.id (uuid). Frontend yang belum login
    bisa kirim string seperti 'demo' / 'petani_abc' — kita simpan NULL daripada
    melempar 500. Boleh None / empty string juga (passthrough sebagai NULL).
    """
    if not value:
        return None
    try:
        return str(_uuid.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        return None


# ── CRUD HELPERS ───────────────────────────────────────
def save_prediction_log(db: Session, input_data: dict, output_data: dict) -> PredictionLog:
    log = PredictionLog(
        ndvi=input_data["ndvi"],
        rainfall_mm=input_data["rainfall_mm"],
        temperature_c=input_data["temperature_c"],
        solar_radiation=input_data["solar_radiation"],
        land_area_ha=input_data["land_area_ha"],
        crop_type=input_data["crop_type"],
        pred_harvest_days=output_data["harvest_days"],
        pred_yield_ton_per_ha=output_data["yield_ton_per_ha"],
        pred_risk_level=output_data["risk_level"],
        pred_confidence=output_data["confidence"],
        model_source=output_data["model_source"],
        petani_id=normalize_petani_id(input_data.get("petani_id")),
        lahan_id=input_data.get("lahan_id"),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def save_feedback(db: Session, feedback_data: dict) -> TrainingFeedback:
    feedback_data = {**feedback_data, "petani_id": normalize_petani_id(feedback_data.get("petani_id"))}
    fb = TrainingFeedback(**feedback_data)
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


def get_unused_feedback(db: Session) -> list[TrainingFeedback]:
    """Ambil semua feedback yang belum dipakai untuk training."""
    return db.query(TrainingFeedback)\
             .filter(TrainingFeedback.used_in_training == False)\
             .all()


def mark_feedback_used(db: Session, ids: list[int], version: int):
    """Tandai feedback sebagai sudah dipakai setelah retrain."""
    db.query(TrainingFeedback)\
      .filter(TrainingFeedback.id.in_(ids))\
      .update({"used_in_training": True, "training_version": version},
              synchronize_session="fetch")
    db.commit()


def get_latest_model_version(db: Session) -> Optional[ModelVersion]:
    return db.query(ModelVersion)\
             .filter(ModelVersion.is_active == True)\
             .order_by(ModelVersion.version.desc())\
             .first()


def save_model_version(db: Session, version_data: dict) -> ModelVersion:
    # Non-aktifkan versi sebelumnya
    db.query(ModelVersion)\
      .filter(ModelVersion.is_active == True)\
      .update({"is_active": False}, synchronize_session="fetch")

    mv = ModelVersion(**version_data, is_active=True)
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv


def get_feedback_count(db: Session) -> dict:
    total = db.query(TrainingFeedback).count()
    unused = db.query(TrainingFeedback)\
               .filter(TrainingFeedback.used_in_training == False)\
               .count()
    return {"total": total, "unused": unused, "used": total - unused}


def get_prediction_stats(db: Session) -> dict:
    total = db.query(PredictionLog).count()
    with_feedback = db.query(PredictionLog)\
                      .filter(PredictionLog.feedback_given == True)\
                      .count()
    return {
        "total_predictions": total,
        "with_feedback": with_feedback,
        "feedback_rate": round(with_feedback / total * 100, 1) if total > 0 else 0
    }