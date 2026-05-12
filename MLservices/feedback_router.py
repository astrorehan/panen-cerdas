# feedback_router.py
"""
Router untuk feedback petani.
Petani lapor hasil panen NYATA setelah panen selesai.
Data ini yang akan dipakai untuk retrain model.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import (
    get_db, save_feedback, save_prediction_log,
    get_feedback_count, get_prediction_stats,
    PredictionLog, TrainingFeedback, SessionLocal
)

router = APIRouter(prefix="/feedback", tags=["feedback"])


# ── SCHEMAS ────────────────────────────────────────────
class FeedbackInput(BaseModel):
    """
    Petani mengisi ini setelah panen selesai.
    Field prediction_log_id opsional — boleh tidak diisi
    jika petani langsung input manual tanpa predict dulu.
    """
    # Referensi ke prediksi sebelumnya (opsional)
    prediction_log_id: Optional[int] = Field(
        None,
        description="ID prediksi sebelumnya (dari response /predict)"
    )

    # Kondisi lahan saat tanam (sama seperti input /predict)
    ndvi: float             = Field(..., ge=0.0, le=1.0)
    rainfall_mm: float      = Field(..., ge=0.0)
    temperature_c: float    = Field(..., ge=10.0, le=50.0)
    solar_radiation: float  = Field(..., ge=0.0)
    land_area_ha: float     = Field(..., gt=0.0)
    crop_type: str          = Field(..., pattern="^(padi|jagung|kedelai|singkong)$")

    # Hasil NYATA dari panen
    actual_harvest_days: int = Field(
        ..., gt=0, le=400,
        description="Berapa hari sampai panen nyata?"
    )
    actual_yield_ton_per_ha: float = Field(
        ..., gt=0,
        description="Hasil panen nyata per hektar (ton)"
    )
    actual_risk_level: str = Field(
        ..., pattern="^(low|medium|high)$",
        description="Seberapa besar masalah yang dialami: low/medium/high"
    )

    # Info tambahan
    petani_id: Optional[str] = None
    lahan_id: Optional[str]  = None
    catatan: Optional[str]   = Field(
        None,
        description="Catatan bebas: hama, banjir, gagal panen, dll"
    )


class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedback_id: int
    total_feedback_terkumpul: int
    estimasi_retrain: str


class FeedbackStats(BaseModel):
    feedback: dict
    predictions: dict
    pesan: str


# ── ENDPOINTS ──────────────────────────────────────────
@router.post(
    "/",
    response_model=FeedbackResponse,
    summary="Lapor hasil panen nyata",
    description="""
Petani mengisi hasil panen nyata setelah panen selesai.

**Kapan diisi?** Setelah panen selesai dan tahu hasilnya.

**Apa yang diisi?**
- Kondisi lahan sama seperti saat minta prediksi
- Berapa hari sampai panen nyatanya
- Berapa ton per hektar hasilnya
- Ada masalah apa? (low/medium/high)
- Catatan bebas (hama, banjir, dll)

Data ini akan dipakai untuk melatih ulang model supaya makin akurat.
    """
)
def submit_feedback(data: FeedbackInput, db: Session = Depends(get_db)):
    try:
        # Simpan ke tabel training_feedback
        fb_data = {
            "prediction_log_id":      data.prediction_log_id,
            "ndvi":                   data.ndvi,
            "rainfall_mm":            data.rainfall_mm,
            "temperature_c":          data.temperature_c,
            "solar_radiation":        data.solar_radiation,
            "land_area_ha":           data.land_area_ha,
            "crop_type":              data.crop_type,
            "actual_harvest_days":    data.actual_harvest_days,
            "actual_yield_ton_per_ha": data.actual_yield_ton_per_ha,
            "actual_risk_level":      data.actual_risk_level,
            "petani_id":              data.petani_id,
            "lahan_id":               data.lahan_id,
            "catatan":                data.catatan,
        }
        fb = save_feedback(db, fb_data)

        # Tandai prediction_log sebagai sudah ada feedback
        if data.prediction_log_id:
            log = db.query(PredictionLog)\
                    .filter(PredictionLog.id == data.prediction_log_id)\
                    .first()
            if log:
                log.feedback_given = True
                db.commit()

        # Hitung total feedback
        counts = get_feedback_count(db)
        total  = counts["total"]

        # Estimasi kapan retrain
        RETRAIN_THRESHOLD = 10   # retrain setiap 10 data baru
        remaining = RETRAIN_THRESHOLD - (counts["unused"] % RETRAIN_THRESHOLD)
        if remaining == RETRAIN_THRESHOLD:
            estimasi = "🔄 Threshold tercapai! Retrain akan berjalan segera"
        else:
            estimasi = f"Perlu {remaining} feedback lagi untuk trigger retrain otomatis"

        return FeedbackResponse(
            success=True,
            message="Terima kasih! Data panen Anda akan membantu meningkatkan akurasi prediksi",
            feedback_id=fb.id,
            total_feedback_terkumpul=total,
            estimasi_retrain=estimasi,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menyimpan feedback: {str(e)}"
        )


@router.get(
    "/stats",
    response_model=FeedbackStats,
    summary="Statistik data feedback"
)
def get_stats(db: Session = Depends(get_db)):
    feedback_stats    = get_feedback_count(db)
    prediction_stats  = get_prediction_stats(db)

    total = feedback_stats["total"]
    if total < 10:
        pesan = f"Terkumpul {total}/10 feedback — belum cukup untuk retrain"
    elif total < 50:
        pesan = f"Terkumpul {total} feedback — model sudah mulai belajar dari data nyata"
    else:
        pesan = f"Terkumpul {total} feedback — model belajar optimal dari data petani!"

    return FeedbackStats(
        feedback=feedback_stats,
        predictions=prediction_stats,
        pesan=pesan,
    )


@router.get(
    "/history",
    summary="Riwayat feedback yang sudah dikirim"
)
def get_history(
    petani_id: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(TrainingFeedback)
    if petani_id:
        query = query.filter(TrainingFeedback.petani_id == petani_id)
    rows = query.order_by(TrainingFeedback.created_at.desc()).limit(limit).all()

    return {
        "total": len(rows),
        "data": [
            {
                "id":                   r.id,
                "crop_type":            r.crop_type,
                "actual_harvest_days":  r.actual_harvest_days,
                "actual_yield_ton_per_ha": r.actual_yield_ton_per_ha,
                "actual_risk_level":    r.actual_risk_level,
                "catatan":              r.catatan,
                "used_in_training":     r.used_in_training,
                "created_at":           r.created_at.isoformat(),
            }
            for r in rows
        ]
    }
