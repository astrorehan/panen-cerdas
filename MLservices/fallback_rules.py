# fallback_rules.py
"""
Rule-based fallback prediction system.
Digunakan ketika model ML belum dilatih atau gagal dimuat.
Logika berbasis domain knowledge pertanian Indonesia.
"""

from schemas import PredictInput, PredictOutput


# ── KONSTANTA PER KOMODITAS ─────────────────────────────
CROP_PROFILES = {
    "padi": {
        "base_harvest_days": 90,
        "base_yield": 5.0,        # ton/ha rata-rata nasional
        "optimal_temp": (24, 30),
        "optimal_rainfall": (150, 300),
        "optimal_ndvi": 0.6,
    },
    "jagung": {
        "base_harvest_days": 95,
        "base_yield": 5.5,
        "optimal_temp": (21, 30),
        "optimal_rainfall": (100, 200),
        "optimal_ndvi": 0.55,
    },
    "kedelai": {
        "base_harvest_days": 85,
        "base_yield": 1.5,
        "optimal_temp": (20, 30),
        "optimal_rainfall": (100, 200),
        "optimal_ndvi": 0.5,
    },
    "singkong": {
        "base_harvest_days": 270,
        "base_yield": 20.0,
        "optimal_temp": (25, 32),
        "optimal_rainfall": (100, 250),
        "optimal_ndvi": 0.5,
    },
}


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _temp_factor(temp: float, opt_range: tuple) -> float:
    """Faktor koreksi suhu: 1.0 = optimal, < 1.0 = tidak optimal."""
    lo, hi = opt_range
    mid = (lo + hi) / 2
    if lo <= temp <= hi:
        return 1.0
    elif temp < lo:
        return _clamp(1.0 - (lo - temp) * 0.04, 0.6, 1.0)
    else:
        return _clamp(1.0 - (temp - hi) * 0.05, 0.5, 1.0)


def _rain_factor(rain: float, opt_range: tuple) -> float:
    """Faktor koreksi curah hujan."""
    lo, hi = opt_range
    if lo <= rain <= hi:
        return 1.0
    elif rain < lo:
        return _clamp(0.7 + (rain / lo) * 0.3, 0.5, 1.0)
    else:
        return _clamp(1.0 - (rain - hi) / hi * 0.3, 0.6, 1.0)


def _ndvi_factor(ndvi: float, optimal_ndvi: float) -> float:
    """Faktor kesehatan tanaman dari NDVI."""
    if ndvi >= optimal_ndvi:
        return _clamp(0.9 + (ndvi - optimal_ndvi) * 0.5, 0.9, 1.1)
    else:
        return _clamp(ndvi / optimal_ndvi, 0.4, 0.9)


def _compute_risk(
    ndvi: float,
    temp_f: float,
    rain_f: float,
    ndvi_f: float,
) -> tuple[str, float]:
    """Hitung risk level dan risk score."""
    # Bobot: NDVI 40%, suhu 30%, hujan 30%
    health_score = (ndvi_f * 0.4) + (temp_f * 0.3) + (rain_f * 0.3)
    risk_score = round(_clamp(1.0 - health_score, 0.0, 1.0), 3)

    if risk_score < 0.25:
        risk_level = "low"
    elif risk_score < 0.55:
        risk_level = "medium"
    else:
        risk_level = "high"

    return risk_level, risk_score


def _build_recommendations(
    data: PredictInput,
    risk_level: str,
    temp_f: float,
    rain_f: float,
    ndvi_f: float,
) -> list[str]:
    recs = []
    profile = CROP_PROFILES[data.crop_type]

    if data.ndvi < 0.4:
        recs.append("⚠ NDVI rendah — periksa kondisi tanaman dan lakukan pemupukan nitrogen")
    elif data.ndvi < profile["optimal_ndvi"]:
        recs.append("Pertimbangkan pemupukan susulan untuk meningkatkan kehijauan tanaman")

    lo_t, hi_t = profile["optimal_temp"]
    if data.temperature_c > hi_t:
        recs.append(f"Suhu {data.temperature_c}°C terlalu tinggi — pertimbangkan irigasi sore hari untuk pendinginan")
    elif data.temperature_c < lo_t:
        recs.append(f"Suhu {data.temperature_c}°C di bawah optimal — pertimbangkan mulsa untuk menjaga kelembaban tanah")

    lo_r, hi_r = profile["optimal_rainfall"]
    if data.rainfall_mm < lo_r:
        recs.append(f"Curah hujan {data.rainfall_mm} mm kurang — aktifkan irigasi tambahan")
    elif data.rainfall_mm > hi_r:
        recs.append(f"Curah hujan {data.rainfall_mm} mm berlebih — pastikan drainase lahan berfungsi baik")

    if risk_level == "high":
        recs.append("🚨 Risiko tinggi — konsultasikan dengan penyuluh pertanian setempat")
    elif risk_level == "medium":
        recs.append("Pantau kondisi lahan lebih intensif, minimal 2x seminggu")

    if not recs:
        recs.append("✅ Kondisi lahan optimal — pertahankan manajemen saat ini")

    return recs


def predict_fallback(data: PredictInput) -> PredictOutput:
    """
    Rule-based prediction tanpa model ML.
    Akurasi lebih rendah tapi selalu tersedia.
    """
    profile = CROP_PROFILES[data.crop_type]

    # Hitung faktor koreksi
    temp_f  = _temp_factor(data.temperature_c, profile["optimal_temp"])
    rain_f  = _rain_factor(data.rainfall_mm,   profile["optimal_rainfall"])
    ndvi_f  = _ndvi_factor(data.ndvi,           profile["optimal_ndvi"])

    # Combined performance factor
    perf = (temp_f * 0.3) + (rain_f * 0.3) + (ndvi_f * 0.4)

    # Estimasi hari panen: lebih lambat jika kondisi buruk
    harvest_days = int(profile["base_harvest_days"] / max(perf, 0.5))
    harvest_days = _clamp(harvest_days, 5, 365)

    # Estimasi yield per hektar
    yield_per_ha = round(profile["base_yield"] * perf, 2)
    yield_per_ha = _clamp(yield_per_ha, 0.5, profile["base_yield"] * 1.3)

    # Total yield
    total_yield = round(yield_per_ha * data.land_area_ha, 2)

    # Risk
    risk_level, risk_score = _compute_risk(
        data.ndvi, temp_f, rain_f, ndvi_f
    )

    # Rekomendasi
    recs = _build_recommendations(data, risk_level, temp_f, rain_f, ndvi_f)

    # Confidence: rule-based selalu lebih rendah dari ML
    confidence = round(0.55 + perf * 0.15, 2)

    return PredictOutput(
        harvest_days=int(harvest_days),
        yield_ton_per_ha=round(float(yield_per_ha), 2),
        total_yield_ton=round(float(total_yield), 2),
        risk_level=risk_level,
        risk_score=risk_score,
        recommendations=recs,
        model_source="fallback_rules",
        confidence=confidence,
    )
