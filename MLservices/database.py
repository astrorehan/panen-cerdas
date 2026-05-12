# database.py
"""
Database layer untuk PanenCerdas ML Service.
Menggunakan SQLite untuk development (zero-config).
Ganti DATABASE_URL ke PostgreSQL saat production.
"""

import os
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, Integer, Float, String, DateTime,
    Boolean, Text, create_engine, text
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

# ── CONFIG ─────────────────────────────────────────────
# Development  : SQLite (langsung jalan, tanpa install apapun)
# Production   : ganti ke PostgreSQL
#   DATABASE_URL=postgresql://user:pass@localhost:5432/panencerdas

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./panencerdas_ml.db"   # default: SQLite lokal
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
    petani_id        = Column(String(50), nullable=True)   # ID petani jika login
    lahan_id         = Column(String(50), nullable=True)   # ID lahan
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
    # Metadata
    petani_id             = Column(String(50), nullable=True)
    lahan_id              = Column(String(50), nullable=True)
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
    """Buat semua tabel jika belum ada."""
    Base.metadata.create_all(bind=engine)
    print("✅ Database & tabel siap")


# ── SESSION HELPER ─────────────────────────────────────
def get_db() -> Session:
    """Dependency injection untuk FastAPI."""
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