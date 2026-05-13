# database.py
"""
Database layer untuk PanenCerdas ML Service.
Menggunakan SQLite untuk development (zero-config).
Ganti DATABASE_URL ke PostgreSQL saat production.

Perbaikan v2.3:
  - TrainingFeedback: tambah kolom pest_pressure dan variety
    agar sinkron dengan model.py yang membacanya via getattr(fb, "pest_pressure")
    dan getattr(fb, "variety"). Tanpa kolom ini getattr() selalu fallback ke
    DEFAULT_PEST_PRESSURE / "Lokal" — data feedback petani yang mungkin menyertakan
    info hama/varietas tidak pernah tersimpan ke DB.
  - PredictionLog: tambah kolom pest_pressure dan variety untuk kelengkapan audit
"""

import os
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, Integer, Float, String, DateTime,
    Boolean, Text, create_engine,
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./panencerdas_ml.db")
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


# ── TABEL 1: prediction_log ────────────────────────────
class PredictionLog(Base):
    __tablename__ = "prediction_log"

    id               = Column(Integer, primary_key=True, index=True)
    ndvi             = Column(Float, nullable=False)
    rainfall_mm      = Column(Float, nullable=False)
    temperature_c    = Column(Float, nullable=False)
    solar_radiation  = Column(Float, nullable=False)
    land_area_ha     = Column(Float, nullable=False)
    crop_type        = Column(String(20), nullable=False)
    # Fitur opsional hama & varietas — NULL jika tidak dikirim
    pest_pressure    = Column(Float, nullable=True, default=0.0)
    variety          = Column(String(50), nullable=True, default="Lokal")
    # Output prediksi model
    pred_harvest_days     = Column(Integer, nullable=False)
    pred_yield_ton_per_ha = Column(Float,   nullable=False)
    pred_risk_level       = Column(String(10), nullable=False)
    pred_confidence       = Column(Float, nullable=False)
    model_source          = Column(String(20), nullable=False)
    # Metadata
    petani_id        = Column(String(50), nullable=True)
    lahan_id         = Column(String(50), nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    feedback_given   = Column(Boolean, default=False)


# ── TABEL 2: training_feedback ─────────────────────────
class TrainingFeedback(Base):
    __tablename__ = "training_feedback"

    id                      = Column(Integer, primary_key=True, index=True)
    prediction_log_id       = Column(Integer, nullable=True)
    # Input kondisi lahan
    ndvi                    = Column(Float, nullable=False)
    rainfall_mm             = Column(Float, nullable=False)
    temperature_c           = Column(Float, nullable=False)
    solar_radiation         = Column(Float, nullable=False)
    land_area_ha            = Column(Float, nullable=False)
    crop_type               = Column(String(20), nullable=False)
    # Fitur opsional hama & varietas — NULL jika tidak dikirim petani
    pest_pressure           = Column(Float, nullable=True, default=0.0)
    variety                 = Column(String(50), nullable=True, default="Lokal")
    # Hasil NYATA dari petani (ground truth)
    actual_harvest_days     = Column(Integer, nullable=False)
    actual_yield_ton_per_ha = Column(Float,   nullable=False)
    actual_risk_level       = Column(String(10), nullable=False)
    # Metadata
    petani_id               = Column(String(50), nullable=True)
    lahan_id                = Column(String(50), nullable=True)
    catatan                 = Column(Text, nullable=True)
    created_at              = Column(DateTime, default=datetime.utcnow)
    used_in_training        = Column(Boolean, default=False)
    training_version        = Column(Integer, nullable=True)


# ── TABEL 3: model_version ─────────────────────────────
class ModelVersion(Base):
    __tablename__ = "model_version"

    id               = Column(Integer, primary_key=True, index=True)
    version          = Column(Integer, nullable=False, unique=True)
    trained_at       = Column(DateTime, default=datetime.utcnow)
    mae_harvest_days = Column(Float, nullable=True)
    mae_yield        = Column(Float, nullable=True)
    risk_accuracy    = Column(Float, nullable=True)
    n_synthetic      = Column(Integer, nullable=True)
    n_real           = Column(Integer, nullable=True)
    is_active        = Column(Boolean, default=False)
    notes            = Column(Text, nullable=True)


# ── INIT DB ────────────────────────────────────────────
def init_db():
    """Buat semua tabel jika belum ada."""
    Base.metadata.create_all(bind=engine)
    print("✅ Database & tabel siap")


# ── SESSION HELPER ─────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── CRUD HELPERS ───────────────────────────────────────
def save_prediction_log(db: Session, input_data: dict, output_data: dict) -> PredictionLog:
    log = PredictionLog(
        ndvi=input_data["ndvi"],
        rainfall_mm=input_data["rainfall_mm"],
        temperature_c=input_data["temperature_c"],
        solar_radiation=input_data["solar_radiation"],
        land_area_ha=input_data["land_area_ha"],
        crop_type=input_data["crop_type"],
        pest_pressure=input_data.get("pest_pressure", 0.0),
        variety=input_data.get("variety", "Lokal"),
        pred_harvest_days=output_data["harvest_days"],
        pred_yield_ton_per_ha=output_data["yield_ton_per_ha"],
        pred_risk_level=output_data["risk_level"],
        pred_confidence=output_data["confidence"],
        model_source=output_data["model_source"],
        petani_id=input_data.get("petani_id"),
        lahan_id=input_data.get("lahan_id"),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def save_feedback(db: Session, feedback_data: dict) -> TrainingFeedback:
    fb = TrainingFeedback(**feedback_data)
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


def get_unused_feedback(db: Session) -> list[TrainingFeedback]:
    return db.query(TrainingFeedback)\
             .filter(TrainingFeedback.used_in_training == False)\
             .all()


def mark_feedback_used(db: Session, ids: list[int], version: int):
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
    db.query(ModelVersion)\
      .filter(ModelVersion.is_active == True)\
      .update({"is_active": False}, synchronize_session="fetch")
    mv = ModelVersion(**version_data, is_active=True)
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv


def get_feedback_count(db: Session) -> dict:
    total  = db.query(TrainingFeedback).count()
    unused = db.query(TrainingFeedback)\
               .filter(TrainingFeedback.used_in_training == False)\
               .count()
    return {"total": total, "unused": unused, "used": total - unused}


def get_prediction_stats(db: Session) -> dict:
    total        = db.query(PredictionLog).count()
    with_feedback = db.query(PredictionLog)\
                      .filter(PredictionLog.feedback_given == True)\
                      .count()
    return {
        "total_predictions": total,
        "with_feedback":     with_feedback,
        "feedback_rate":     round(with_feedback / total * 100, 1) if total > 0 else 0,
    }
