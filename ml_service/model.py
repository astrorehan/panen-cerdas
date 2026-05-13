"""
model.py
--------
ML Model untuk prediksi panen PanenCerdas.

v2.4:
  - CROP_TYPES diperluas ke 9 komoditas:
    padi, jagung, kedelai, ubi_jalar, ubi_kayu,
    cabe_besar, cabe_rawit, bawang_merah, bawang_putih
  - VARIETY_CATALOG ditambah untuk semua komoditas baru
  - base_yield & base_harvest disesuaikan per komoditas
  - Synthetic data generator aware semua 9 crop
  - _load_real_data() membaca CSV per komoditas dari Data_Raw/
    jika convert_bps_to_training.py sudah dijalankan
"""

import joblib
import numpy as np
import pandas as pd
import logging
from pathlib import Path
from typing import Optional
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score

from schemas import PredictInput, PredictOutput
from fallback_rules import predict_fallback, CROP_PROFILES

logger = logging.getLogger(__name__)

MODEL_DIR          = Path(__file__).parent / "saved_models"
DATA_DIR           = Path(__file__).parent / "data"
HARVEST_MODEL_PATH = MODEL_DIR / "harvest_days_model.joblib"
YIELD_MODEL_PATH   = MODEL_DIR / "yield_model.joblib"
RISK_MODEL_PATH    = MODEL_DIR / "risk_model.joblib"
ENCODER_PATH       = MODEL_DIR / "crop_encoder.joblib"
FEATURE_META_PATH  = MODEL_DIR / "feature_meta.joblib"

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────
USE_PEST    = True
USE_VARIETY = True

# Semua 9 komoditas — urutan HARUS konsisten (dipakai LabelEncoder)
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

FEATURES_BASE = [
    "ndvi", "rainfall_mm", "temperature_c",
    "solar_radiation", "land_area_ha", "crop_encoded",
]
FEATURES_PEST = ["pest_pressure"]
FEATURES_VAR  = ["variety_encoded"]

MIN_REAL_SAMPLES    = 100
TARGET_TOTAL        = 2000
DEFAULT_PEST_PRESSURE = 0.0


# ── BASELINE PER KOMODITAS (ton/ha) ──────────────────────────────────────────
# Dipakai untuk: synthetic data, risk calculation, feedback normalization
BASE_YIELD = {
    "padi":         5.2,
    "jagung":       5.8,
    "kedelai":      1.5,
    "ubi_jalar":   15.0,
    "ubi_kayu":    20.0,
    "cabe_besar":   8.0,
    "cabe_rawit":   6.0,
    "bawang_merah": 9.5,
    "bawang_putih": 7.0,
}

BASE_HARVEST = {
    "padi":         110,
    "jagung":       100,
    "kedelai":       85,
    "ubi_jalar":    120,
    "ubi_kayu":     270,
    "cabe_besar":    90,
    "cabe_rawit":    75,
    "bawang_merah":  65,
    "bawang_putih": 100,
}


# ── VARIETY CATALOG ───────────────────────────────────────────────────────────
# Format: {crop_type: [(nama_varietas, yield_modifier, days_modifier)]}
#   yield_modifier : pengali hasil panen vs baseline (1.0 = sama)
#   days_modifier  : koreksi hari panen vs base (negatif = lebih cepat)
VARIETY_CATALOG: dict[str, list[tuple[str, float, int]]] = {
    "padi": [
        ("IR64",        1.00,   0),
        ("Ciherang",    1.05,  -5),
        ("Inpari32",    1.10,  -8),
        ("Memberamo",   0.92,  +5),
        ("Lokal",       0.85, +10),
    ],
    "jagung": [
        ("NK7328",      1.00,   0),
        ("Pioneer36",   1.12,  -5),
        ("Bisi18",      0.95,  +3),
        ("Lokal",       0.80,  +8),
    ],
    "kedelai": [
        ("Anjasmoro",   1.00,   0),
        ("Dena1",       1.08,  -5),
        ("Grobogan",    1.05,  -3),
        ("Lokal",       0.82,  +7),
    ],
    "ubi_jalar": [
        ("Cilembu",     1.05,   0),   # manis premium, yield tinggi
        ("Papua Solossa",1.10, -10),  # potensi hasil tertinggi
        ("Sukuh",       0.95,  +5),
        ("Lokal",       0.85, +15),
    ],
    "ubi_kayu": [
        ("UJ5",         1.10, -15),
        ("Adira1",      1.00,   0),
        ("Malang6",     1.15, -20),
        ("Lokal",       0.85, +20),
    ],
    "cabe_besar": [
        ("Lado",        1.05,  -5),
        ("Tit Super",   1.00,   0),
        ("Gada",        0.95,  +5),
        ("Lokal",       0.80, +10),
    ],
    "cabe_rawit": [
        ("Pelita",      1.05,  -3),
        ("Dewata",      1.00,   0),
        ("Ori",         0.95,  +5),
        ("Lokal",       0.82,  +8),
    ],
    "bawang_merah": [
        ("Bima Brebes", 1.05,  -5),
        ("Tajuk",       1.00,   0),
        ("Katumi",      1.08,  -3),
        ("Lokal",       0.82,  +8),
    ],
    "bawang_putih": [
        ("Lumbu Hijau",  1.00,   0),
        ("Tawangmangu",  1.05,  -5),
        ("Kesuma",       0.95,  +5),
        ("Lokal",        0.80, +10),
    ],
}

ALL_VARIETIES   = sorted({v[0] for vlist in VARIETY_CATALOG.values() for v in vlist})
VARIETY_ENCODER = LabelEncoder().fit(ALL_VARIETIES)


# ── PEST PRESSURE MAP ─────────────────────────────────────────────────────────
PEST_PRESSURE_MAP: dict[str, float] = {
    "tidak_ada":            0.0,
    "ringan":               0.3,
    "sedang":               0.6,
    "berat":                0.9,
    # Padi
    "wereng_coklat":        0.7,
    "blast":                0.8,
    "penggerek_batang":     0.5,
    # Jagung
    "ulat_grayak":          0.6,
    "bulai":                0.75,
    # Kedelai
    "karat_daun":           0.55,
    "ulat_penggulung":      0.5,
    # Hortikultura
    "antraknosa":           0.7,   # cabe
    "busuk_buah":           0.65,  # cabe/bawang
    "thrips":               0.5,   # bawang
    "fusarium":             0.75,  # bawang
    "busuk_batang":         0.75,
    "kutu_daun":            0.40,
}


# ── HELPERS ───────────────────────────────────────────────────────────────────
def encode_variety(variety_name: Optional[str], crop_type: str) -> int:
    if variety_name is None:
        variety_name = "Lokal"
    try:
        return int(VARIETY_ENCODER.transform([variety_name])[0])
    except Exception:
        logger.warning(f"Varietas '{variety_name}' tidak dikenal → pakai 'Lokal'")
        return int(VARIETY_ENCODER.transform(["Lokal"])[0])


def _get_active_features() -> list[str]:
    feats = list(FEATURES_BASE)
    if USE_PEST:    feats += FEATURES_PEST
    if USE_VARIETY: feats += FEATURES_VAR
    return feats


def _compute_risk_opsi_b(
    ndvi: float, rainfall: float, temp: float,
    yield_ha: float, crop_type: str
) -> str:
    """
    Risk dari kombinasi iklim + yield (Opsi B).
    Lebih akurat daripada yield-only.
    """
    profile  = CROP_PROFILES[crop_type]
    opt_ndvi = profile["optimal_ndvi"]
    lo_t, hi_t = profile["optimal_temp"]
    lo_r, hi_r = profile["optimal_rainfall"]
    baseline = BASE_YIELD[crop_type]

    ndvi_s = min(1.0, ndvi / max(opt_ndvi, 0.01))

    if lo_t <= temp <= hi_t:
        temp_s = 1.0
    else:
        temp_s = max(0.4, 1.0 - abs(temp - (lo_t + hi_t) / 2) * 0.05)

    if lo_r <= rainfall <= hi_r:
        rain_s = 1.0
    elif rainfall < lo_r:
        rain_s = max(0.4, 0.7 + (rainfall / lo_r) * 0.3)
    else:
        excess = (rainfall - hi_r) / hi_r
        rain_s = max(0.3, 1.0 - excess * 0.5)

    yield_s = min(1.2, yield_ha / max(baseline, 0.01))

    score = ndvi_s * 0.35 + temp_s * 0.25 + rain_s * 0.20 + yield_s * 0.20
    return "low" if score >= 0.85 else ("medium" if score >= 0.65 else "high")


# ── SYNTHETIC DATA ────────────────────────────────────────────────────────────
def _generate_synthetic_data(n_samples: int = 2000) -> pd.DataFrame:
    rng        = np.random.default_rng(42)
    crop_types = rng.choice(CROP_TYPES, n_samples)

    ndvi          = rng.uniform(0.1, 0.95, n_samples)
    rainfall_mm   = rng.uniform(20, 400, n_samples)
    temperature_c = rng.uniform(15, 38, n_samples)  # diperluas untuk bawang putih
    solar_rad     = rng.uniform(80, 350, n_samples)
    land_area_ha  = rng.uniform(0.1, 5.0, n_samples)  # hortikultura lahannya lebih kecil

    pest_pressure = rng.choice(
        [0.0, 0.0, 0.0, 0.3, 0.3, 0.6, 0.9], n_samples
    ).astype(float)
    pest_pressure += rng.normal(0, 0.05, n_samples)
    pest_pressure  = np.clip(pest_pressure, 0.0, 1.0)

    variety_names = np.array([
        rng.choice([v[0] for v in VARIETY_CATALOG[ct]])
        for ct in crop_types
    ])

    harvest_days_list, yield_list, risk_list = [], [], []

    for i in range(n_samples):
        ct      = crop_types[i]
        profile = CROP_PROFILES[ct]
        bh      = BASE_HARVEST[ct]
        by      = BASE_YIELD[ct]

        lo_t, hi_t = profile["optimal_temp"]
        lo_r, hi_r = profile["optimal_rainfall"]

        ndvi_f = 0.6 + ndvi[i] * 0.6
        temp   = temperature_c[i]
        mid_t  = (lo_t + hi_t) / 2
        temp_f = 1.0 if lo_t <= temp <= hi_t else max(0.4, 1.0 - abs(temp - mid_t) * 0.05)
        rain   = rainfall_mm[i]
        if lo_r <= rain <= hi_r:
            rain_f = 1.0
        elif rain < lo_r:
            rain_f = max(0.4, 0.7 + (rain / lo_r) * 0.3)
        else:
            rain_f = max(0.3, 1.0 - ((rain - hi_r) / hi_r) * 0.5)

        pest_f = 1.0 - pest_pressure[i] * 0.4

        vname = variety_names[i]
        match = next((v for v in VARIETY_CATALOG[ct] if v[0] == vname), None)
        var_yield_mod = match[1] if match else 1.0
        var_days_mod  = match[2] if match else 0

        perf  = ndvi_f * 0.40 + temp_f * 0.30 + rain_f * 0.20 + pest_f * 0.10
        noise = rng.normal(1.0, 0.05)

        hd = int((bh + var_days_mod) / max(perf, 0.5) * noise)
        yt = round(by * var_yield_mod * perf * noise, 2)

        hd = int(np.clip(hd, 5, 400))
        yt = float(np.clip(yt, profile["yield_min"], by * var_yield_mod * 1.4))

        risk = _compute_risk_opsi_b(ndvi[i], rain, temp, yt, ct)

        harvest_days_list.append(hd)
        yield_list.append(yt)
        risk_list.append(risk)

    return pd.DataFrame({
        "ndvi":             ndvi,
        "rainfall_mm":      rainfall_mm,
        "temperature_c":    temperature_c,
        "solar_radiation":  solar_rad,
        "land_area_ha":     land_area_ha,
        "crop_type":        crop_types,
        "harvest_days":     harvest_days_list,
        "yield_ton_per_ha": yield_list,
        "risk_level":       risk_list,
        "pest_pressure":    pest_pressure,
        "variety":          variety_names,
        "data_source":      "synthetic",
    })


# ── LOAD REAL DATA ────────────────────────────────────────────────────────────
def _load_real_data(db=None) -> pd.DataFrame:
    REQUIRED = [
        "ndvi", "rainfall_mm", "temperature_c", "solar_radiation",
        "land_area_ha", "crop_type", "harvest_days", "yield_ton_per_ha", "risk_level",
    ]
    frames = []

    # ── Sumber 1: Feedback petani dari DB ─────────────
    if db is not None:
        try:
            from database import get_unused_feedback
            feedbacks = get_unused_feedback(db)
            if feedbacks:
                rows = []
                for fb in feedbacks:
                    base  = BASE_YIELD.get(fb.crop_type, 5.0)
                    ratio = fb.actual_yield_ton_per_ha / base if base > 0 else 1.0
                    risk  = "low" if ratio >= 0.85 else ("medium" if ratio >= 0.65 else "high")
                    rows.append({
                        "ndvi":             fb.ndvi,
                        "rainfall_mm":      fb.rainfall_mm,
                        "temperature_c":    fb.temperature_c,
                        "solar_radiation":  fb.solar_radiation,
                        "land_area_ha":     fb.land_area_ha,
                        "crop_type":        fb.crop_type,
                        "harvest_days":     fb.actual_harvest_days,
                        "yield_ton_per_ha": fb.actual_yield_ton_per_ha,
                        "risk_level":       risk,
                        "data_source":      "petani_feedback",
                        "ndvi_source":      "user_input",
                        "pest_pressure":    getattr(fb, "pest_pressure", DEFAULT_PEST_PRESSURE),
                        "variety":          getattr(fb, "variety", "Lokal"),
                    })
                frames.append(pd.DataFrame(rows))
                logger.info(f"✅ {len(rows)} baris dari feedback petani")
        except Exception as e:
            logger.warning(f"Gagal load feedback petani: {e}")

    # ── Sumber 2: CSV gabungan di folder data/ ─────────
    for csv_file in ["bps_produksi.csv", "kementan_lahan.csv", "bps_template.csv"]:
        csv_path = DATA_DIR / csv_file
        if not csv_path.exists():
            continue
        try:
            df = pd.read_csv(csv_path)
            # Filter hanya crop_type yang dikenal
            if "crop_type" in df.columns:
                df = df[df["crop_type"].isin(CROP_TYPES)]
            missing = [c for c in REQUIRED if c not in df.columns]
            if missing:
                logger.warning(f"{csv_file} kurang kolom: {missing} — skip")
                continue
            df["data_source"]  = csv_file.replace(".csv", "")
            if "ndvi_source"   not in df.columns: df["ndvi_source"]   = "bps_manual"
            if "pest_pressure" not in df.columns: df["pest_pressure"] = DEFAULT_PEST_PRESSURE
            if "variety"       not in df.columns: df["variety"]       = "Lokal"
            frames.append(df[REQUIRED + ["data_source", "ndvi_source", "pest_pressure", "variety"]])
            logger.info(f"✅ {len(df)} baris dari {csv_file} "
                        f"({df['crop_type'].value_counts().to_dict()})")
        except Exception as e:
            logger.warning(f"Gagal baca {csv_file}: {e}")

    # ── Sumber 3: NASA POWER cache ─────────────────────
    nasa_cache = DATA_DIR / "nasa_power_cache.csv"
    if nasa_cache.exists():
        try:
            df = pd.read_csv(nasa_cache)
            if "crop_type" in df.columns:
                df = df[df["crop_type"].isin(CROP_TYPES)]
            missing = [c for c in REQUIRED if c not in df.columns]
            if missing:
                logger.warning(f"nasa_power_cache.csv kurang kolom: {missing} — skip")
            else:
                df["data_source"]  = "nasa_power_historical"
                if "ndvi_source"   not in df.columns: df["ndvi_source"]   = "seasonal_estimate"
                if "pest_pressure" not in df.columns: df["pest_pressure"] = DEFAULT_PEST_PRESSURE
                if "variety"       not in df.columns: df["variety"]       = "Lokal"
                frames.append(df[REQUIRED + ["data_source", "ndvi_source", "pest_pressure", "variety"]])
                logger.info(f"✅ {len(df)} baris dari NASA POWER cache")
        except Exception as e:
            logger.warning(f"Gagal baca nasa_power_cache.csv: {e}")

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    combined = combined.dropna(subset=REQUIRED)

    # Validasi crop_type — buang baris yang tidak dikenal
    unknown = ~combined["crop_type"].isin(CROP_TYPES)
    if unknown.any():
        logger.warning(f"Buang {unknown.sum()} baris crop_type tidak dikenal: "
                       f"{combined.loc[unknown, 'crop_type'].unique()}")
        combined = combined[~unknown]

    return combined


# ── GABUNGKAN DATA ────────────────────────────────────────────────────────────
def _load_training_data(db=None) -> tuple[pd.DataFrame, dict]:
    real_df = _load_real_data(db)
    n_real  = len(real_df)
    logger.info(f"Total data real: {n_real} baris")

    if n_real >= TARGET_TOTAL:
        logger.info("✅ Pakai data real saja (sudah cukup)")
        return real_df, {"n_real": n_real, "n_synthetic": 0}

    n_synthetic = max(TARGET_TOTAL - n_real, MIN_REAL_SAMPLES)
    synth_df    = _generate_synthetic_data(n_synthetic)
    logger.info(f"Tambah {n_synthetic} baris synthetic sebagai pelengkap")

    combined = pd.concat([real_df, synth_df], ignore_index=True) if n_real > 0 else synth_df
    return combined, {"n_real": n_real, "n_synthetic": n_synthetic}


# ── ENCODE FITUR ──────────────────────────────────────────────────────────────
def _encode_features(df: pd.DataFrame, crop_enc=None, fit: bool = False):
    if fit:
        crop_enc = LabelEncoder()
        crop_enc.fit(CROP_TYPES)

    df = df.copy()
    df["crop_encoded"] = crop_enc.transform(df["crop_type"])

    if USE_VARIETY:
        if "variety" not in df.columns: df["variety"] = "Lokal"
        df["variety"] = df["variety"].fillna("Lokal")
        known = set(ALL_VARIETIES)
        df["variety"] = df["variety"].apply(lambda v: v if v in known else "Lokal")
        df["variety_encoded"] = VARIETY_ENCODER.transform(df["variety"])

    if USE_PEST:
        if "pest_pressure" not in df.columns: df["pest_pressure"] = DEFAULT_PEST_PRESSURE
        df["pest_pressure"] = df["pest_pressure"].fillna(DEFAULT_PEST_PRESSURE).clip(0.0, 1.0)

    return df, crop_enc


# ── TRAIN ─────────────────────────────────────────────────────────────────────
def train_and_save(db=None) -> dict:
    active_features = _get_active_features()
    print("🌱 Menyiapkan data training...")
    print(f"   Komoditas      : {CROP_TYPES}")
    print(f"   Fitur aktif    : {active_features}")
    print(f"   Fitur hama     : {'✅' if USE_PEST else '⛔'}")
    print(f"   Fitur varietas : {'✅' if USE_VARIETY else '⛔'}")

    df, data_stats = _load_training_data(db)
    df, encoder    = _encode_features(df, fit=True)

    if "data_source" in df.columns:
        print(f"   Sumber data    : {df['data_source'].value_counts().to_dict()}")
    print(f"   Per crop       : {df['crop_type'].value_counts().to_dict()}")
    print(f"   Total data     : {len(df)} baris "
          f"({data_stats['n_real']} real + {data_stats['n_synthetic']} synthetic)")

    X         = df[active_features]
    y_harvest = df["harvest_days"]
    y_yield   = df["yield_ton_per_ha"]
    y_risk    = df["risk_level"]

    X_tr, X_te, yh_tr, yh_te, yy_tr, yy_te, yr_tr, yr_te = train_test_split(
        X, y_harvest, y_yield, y_risk, test_size=0.2, random_state=42
    )

    print("🤖 Training harvest_days model...")
    harvest_model = RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1)
    harvest_model.fit(X_tr, yh_tr)
    mae_h = mean_absolute_error(yh_te, harvest_model.predict(X_te))
    print(f"   MAE harvest_days : {mae_h:.1f} hari")

    print("🌾 Training yield model...")
    yield_model = RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1)
    yield_model.fit(X_tr, yy_tr)
    mae_y = mean_absolute_error(yy_te, yield_model.predict(X_te))
    print(f"   MAE yield        : {mae_y:.2f} ton/ha")

    print("⚠️  Training risk classifier...")
    risk_model = RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=-1)
    risk_model.fit(X_tr, yr_tr)
    acc = accuracy_score(yr_te, risk_model.predict(X_te))
    print(f"   Accuracy risk    : {acc:.1%}")

    # Feature importance
    imp = dict(zip(active_features, harvest_model.feature_importances_.round(3)))
    print(f"   Feature importance (harvest): {imp}")

    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(harvest_model, HARVEST_MODEL_PATH)
    joblib.dump(yield_model,   YIELD_MODEL_PATH)
    joblib.dump(risk_model,    RISK_MODEL_PATH)
    joblib.dump(encoder,       ENCODER_PATH)
    joblib.dump(
        {"features": active_features, "use_pest": USE_PEST, "use_variety": USE_VARIETY,
         "crop_types": CROP_TYPES},
        FEATURE_META_PATH,
    )
    print(f"✅ Semua model tersimpan di {MODEL_DIR}/")

    return {
        "mae_harvest_days": round(mae_h, 2),
        "mae_yield":        round(mae_y, 3),
        "risk_accuracy":    round(acc, 4),
        "features_used":    active_features,
        "crop_types":       CROP_TYPES,
        **data_stats,
    }


# ── LOAD MODEL ────────────────────────────────────────────────────────────────
_models: dict = {}


def load_models() -> bool:
    global _models
    try:
        if not all(p.exists() for p in [HARVEST_MODEL_PATH, YIELD_MODEL_PATH,
                                         RISK_MODEL_PATH, ENCODER_PATH]):
            return False
        _models["harvest"]      = joblib.load(HARVEST_MODEL_PATH)
        _models["yield"]        = joblib.load(YIELD_MODEL_PATH)
        _models["risk"]         = joblib.load(RISK_MODEL_PATH)
        _models["encoder"]      = joblib.load(ENCODER_PATH)
        _models["feature_meta"] = (
            joblib.load(FEATURE_META_PATH) if FEATURE_META_PATH.exists()
            else {"features": FEATURES_BASE, "use_pest": False, "use_variety": False,
                  "crop_types": CROP_TYPES}
        )
        print("✅ Semua model berhasil dimuat")
        print(f"   Fitur  : {_models['feature_meta']['features']}")
        print(f"   Crops  : {_models['feature_meta'].get('crop_types', CROP_TYPES)}")
        return True
    except Exception as e:
        print(f"⚠️  Gagal memuat model: {e}")
        _models = {}
        return False


def is_model_loaded() -> bool:
    return bool(_models)


# ── PREDICT ───────────────────────────────────────────────────────────────────
def predict(data: PredictInput) -> PredictOutput:
    if not is_model_loaded():
        logger.warning("Model tidak tersedia — fallback rules")
        return predict_fallback(data)

    try:
        enc          = _models["encoder"]
        feat_meta    = _models["feature_meta"]
        active_feats = feat_meta["features"]
        use_pest_now = feat_meta.get("use_pest", False)
        use_var_now  = feat_meta.get("use_variety", False)

        # Validasi crop_type dikenal model
        trained_crops = feat_meta.get("crop_types", CROP_TYPES)
        if data.crop_type not in trained_crops:
            logger.warning(f"crop_type '{data.crop_type}' tidak ada di model → fallback")
            return predict_fallback(data)

        row = pd.DataFrame([{
            "ndvi":            data.ndvi,
            "rainfall_mm":     data.rainfall_mm,
            "temperature_c":   data.temperature_c,
            "solar_radiation": data.solar_radiation,
            "land_area_ha":    data.land_area_ha,
            "crop_type":       data.crop_type,
        }])
        row["crop_encoded"] = enc.transform(row["crop_type"])

        if use_pest_now:
            pest_val = float(getattr(data, "pest_pressure", DEFAULT_PEST_PRESSURE) or DEFAULT_PEST_PRESSURE)
            row["pest_pressure"] = np.clip(pest_val, 0.0, 1.0)

        if use_var_now:
            row["variety_encoded"] = encode_variety(getattr(data, "variety", None), data.crop_type)

        X = row[active_feats]

        harvest_days = int(round(_models["harvest"].predict(X)[0]))
        yield_per_ha = round(float(_models["yield"].predict(X)[0]), 2)
        risk_level   = str(_models["risk"].predict(X)[0])
        risk_proba   = _models["risk"].predict_proba(X)[0]
        confidence   = round(float(risk_proba.max()), 2)
        total_yield  = round(yield_per_ha * data.land_area_ha, 2)
        risk_score   = round({"low": 0.15, "medium": 0.50, "high": 0.85}.get(risk_level, 0.5), 2)

        from fallback_rules import (
            _build_recommendations, _temp_factor, _rain_factor, _ndvi_factor
        )
        profile = CROP_PROFILES[data.crop_type]
        recs = _build_recommendations(
            data, risk_level,
            _temp_factor(data.temperature_c, profile["optimal_temp"]),
            _rain_factor(data.rainfall_mm,   profile["optimal_rainfall"]),
            _ndvi_factor(data.ndvi,           profile["optimal_ndvi"]),
        )

        if use_pest_now:
            pp = float(getattr(data, "pest_pressure", 0.0) or 0.0)
            if pp >= 0.7:
                recs.append("🐛 Serangan hama berat — segera lakukan pengendalian OPT")
            elif pp >= 0.4:
                recs.append("🐛 Waspadai serangan hama sedang — pantau lahan tiap 3 hari")

        return PredictOutput(
            harvest_days=harvest_days,
            yield_ton_per_ha=yield_per_ha,
            total_yield_ton=total_yield,
            risk_level=risk_level,
            risk_score=risk_score,
            recommendations=recs,
            model_source="ml_model",
            confidence=confidence,
        )

    except Exception as e:
        logger.error(f"Error prediksi ML: {e} — fallback")
        return predict_fallback(data)
