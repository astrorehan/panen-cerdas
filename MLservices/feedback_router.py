# feedback_router.py
"""
Router untuk feedback petani.
Petani lapor hasil panen NYATA setelah panen selesai.
Data ini yang akan dipakai untuk retrain model.

Perbaikan v2.3:
  - FeedbackInput: tambah pest_pressure (opsional) dan variety (opsional)
    agar data hama & varietas dari petani bisa tersimpan ke DB dan
    dipakai model saat retrain (sinkron dengan database.py & model.py)
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import (
    get_db, save_feedback, get_feedback_count, get_prediction_stats,
    PredictionLog, TrainingFeedback,
)

router = APIRouter(prefix="/feedback", tags=["feedback"])


# ── SCHEMAS ────────────────────────────────────────────
class FeedbackInput(BaseModel):
    # Referensi ke prediksi sebelumnya (opsional)
    prediction_log_id: Optional[int] = Field(
        None,
        description="ID prediksi sebelumnya (dari response /predict). Opsional."
    )

    # Kondisi lahan saat tanam
    ndvi: float            = Field(..., ge=0.0, le=1.0)
    rainfall_mm: float     = Field(..., ge=0.0)
    temperature_c: float   = Field(..., ge=10.0, le=50.0)
    solar_radiation: float = Field(..., ge=0.0)
    land_area_ha: float    = Field(..., gt=0.0)
    crop_type: str         = Field(..., pattern="^(padi|jagung|kedelai|ubi_jalar|ubi_kayu|cabe_besar|cabe_rawit|bawang_merah|bawang_putih)$")

    # Fitur opsional hama & varietas — sinkron dengan schemas.PredictInput
    pest_pressure: Optional[float] = Field(
        default=0.0,
        ge=0.0, le=1.0,
        description=(
            "Tingkat serangan hama saat musim tanam ini (0.0–1.0). "
            "0.0 = tidak ada, 0.3 = ringan, 0.6 = sedang, 0.9 = berat. Opsional."
        ),
    )
    variety: Optional[str] = Field(
        default=None,
        description=(
            "Varietas yang ditanam. "
            "Contoh: Ciherang, Inpari32, IR64, Lokal. Opsional."
        ),
    )

    # Hasil NYATA dari panen
    actual_harvest_days: int = Field(
        ..., gt=0, le=400,
        description="Berapa hari dari tanam sampai panen nyata?"
    )
    actual_yield_ton_per_ha: float = Field(
        ..., gt=0,
        description="Hasil panen nyata per hektar (ton)."
    )
    actual_risk_level: str = Field(
        ..., pattern="^(low|medium|high)$",
        description="Tingkat masalah yang dialami: low / medium / high."
    )

    # Metadata
    petani_id: Optional[str] = None
    lahan_id: Optional[str]  = None
    catatan: Optional[str]   = Field(
        None,
        description="Catatan bebas: hama, banjir, gagal panen, dll."
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
)
def submit_feedback(data: FeedbackInput, db: Session = Depends(get_db)):
    try:
        fb_data = {
            "prediction_log_id":        data.prediction_log_id,
            "ndvi":                     data.ndvi,
            "rainfall_mm":              data.rainfall_mm,
            "temperature_c":            data.temperature_c,
            "solar_radiation":          data.solar_radiation,
            "land_area_ha":             data.land_area_ha,
            "crop_type":                data.crop_type,
            "pest_pressure":            data.pest_pressure if data.pest_pressure is not None else 0.0,
            "variety":                  data.variety or "Lokal",
            "actual_harvest_days":      data.actual_harvest_days,
            "actual_yield_ton_per_ha":  data.actual_yield_ton_per_ha,
            "actual_risk_level":        data.actual_risk_level,
            "petani_id":                data.petani_id,
            "lahan_id":                 data.lahan_id,
            "catatan":                  data.catatan,
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

        counts    = get_feedback_count(db)
        total     = counts["total"]
        THRESHOLD = 10
        remaining = THRESHOLD - (counts["unused"] % THRESHOLD)
        if remaining == THRESHOLD:
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


@router.get("/stats", response_model=FeedbackStats, summary="Statistik data feedback")
def get_stats(db: Session = Depends(get_db)):
    feedback_stats   = get_feedback_count(db)
    prediction_stats = get_prediction_stats(db)
    total = feedback_stats["total"]
    if total < 10:
        pesan = f"Terkumpul {total}/10 feedback — belum cukup untuk retrain"
    elif total < 50:
        pesan = f"Terkumpul {total} feedback — model sudah mulai belajar dari data nyata"
    else:
        pesan = f"Terkumpul {total} feedback — model belajar optimal dari data petani!"
    return FeedbackStats(feedback=feedback_stats, predictions=prediction_stats, pesan=pesan)


@router.get("/history", summary="Riwayat feedback yang sudah dikirim")
def get_history(
    petani_id: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(TrainingFeedback)
    if petani_id:
        query = query.filter(TrainingFeedback.petani_id == petani_id)
    rows = query.order_by(TrainingFeedback.created_at.desc()).limit(limit).all()
    return {
        "total": len(rows),
        "data": [
            {
                "id":                      r.id,
                "crop_type":               r.crop_type,
                "pest_pressure":           r.pest_pressure,
                "variety":                 r.variety,
                "actual_harvest_days":     r.actual_harvest_days,
                "actual_yield_ton_per_ha": r.actual_yield_ton_per_ha,
                "actual_risk_level":       r.actual_risk_level,
                "catatan":                 r.catatan,
                "used_in_training":        r.used_in_training,
                "created_at":              r.created_at.isoformat(),
            }
            for r in rows
        ],
    }
