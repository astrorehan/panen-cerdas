"""
lahan_router.py
---------------
Endpoint daftar lahan petani.

Tidak ada tabel `Lahan` di DB — kita derive dari prediction_log:
satu lahan = satu kombinasi (petani_id, lahan_id) yang pernah diprediksi.
Status & catatan dihitung dari prediksi terakhir + feedback yang sudah masuk.

Kalau di kemudian hari ada registrasi lahan eksplisit, ganti query
sumber ke tabel Lahan tanpa ubah response shape.
"""

from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db, PredictionLog, TrainingFeedback

router = APIRouter(prefix="/api/lahan", tags=["lahan"])


def _status_from_pred(crop_type: Optional[str], risk: Optional[str]) -> str:
    if not crop_type:
        return "kosong"
    if risk == "high":
        return "panen-segera"
    return "tumbuh"


@router.get("", summary="Daftar lahan petani")
def list_lahan(
    petani_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Daftar lahan yang pernah diprediksi.

    - Tanpa `petani_id` -> semua lahan terdaftar (admin/debug)
    - Dengan `petani_id` -> hanya lahan milik petani itu
    """
    query = db.query(PredictionLog)
    if petani_id:
        query = query.filter(PredictionLog.petani_id == petani_id)

    rows = query.filter(PredictionLog.lahan_id.isnot(None)).all()

    grouped: dict[tuple[str, str], list[PredictionLog]] = {}
    for r in rows:
        key = (r.petani_id or "_", r.lahan_id)
        grouped.setdefault(key, []).append(r)

    items = []
    for (pid, lid), preds in grouped.items():
        preds.sort(key=lambda p: p.created_at, reverse=True)
        last = preds[0]

        fb_count = (
            db.query(func.count(TrainingFeedback.id))
            .filter(TrainingFeedback.lahan_id == lid)
            .scalar()
        ) or 0

        items.append({
            "lahan_id":               lid,
            "petani_id":              pid if pid != "_" else None,
            "last_crop_type":         last.crop_type,
            "last_yield_ton_per_ha":  last.pred_yield_ton_per_ha,
            "last_harvest_days":      last.pred_harvest_days,
            "last_risk_level":        last.pred_risk_level,
            "last_land_area_ha":      last.land_area_ha,
            "last_predicted_at":      last.created_at.isoformat(),
            "total_predictions":      len(preds),
            "total_feedback":         fb_count,
            "status":                 _status_from_pred(last.crop_type, last.pred_risk_level),
        })

    items.sort(key=lambda x: x["last_predicted_at"], reverse=True)

    total_ha = round(sum(i["last_land_area_ha"] or 0 for i in items), 2)
    aktif = sum(1 for i in items if i["status"] != "kosong")

    return {
        "petani_id":  petani_id,
        "total":      len(items),
        "total_ha":   total_ha,
        "aktif":      aktif,
        "items":      items,
    }
