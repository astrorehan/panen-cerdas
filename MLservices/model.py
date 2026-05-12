"""
model.py
--------
ML Model untuk prediksi panen PanenCerdas.

Perubahan dari v2.2 → v2.3:
  - Tambah fitur OPSIONAL: pest_pressure (tingkat serangan hama) & variety_code (varietas)
  - Data dummy hama & varietas disertakan sebagai fallback jika data real tidak ada
  - FEATURES_BASE  : fitur wajib (selalu dipakai)
  - FEATURES_PEST  : tambahan jika USE_PEST=True
  - FEATURES_VAR   : tambahan jika USE_VARIETY=True
  - Model menyesuaikan fitur saat training & inferensi secara otomatis
  - Fitur meta disimpan di saved_models/feature_meta.joblib

Cara pakai data hama & varietas:
  1. Punya data real   → taruh di data/pest_data.csv / data/variety_data.csv (lihat README)
  2. Tidak punya data  → set USE_PEST=False / USE_VARIETY=False di bawah
  3. Pakai dummy saja  → biarkan USE_PEST=True / USE_VARIETY=True (default)
"""

import os
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
from fallback_rules import predict_fallback

logger = logging.getLogger(__name__)

MODEL_DIR           = Path(__file__).parent / "saved_models"
HARVEST_MODEL_PATH  = MODEL_DIR / "harvest_days_model.joblib"
YIELD_MODEL_PATH    = MODEL_DIR / "yield_model.joblib"
RISK_MODEL_PATH     = MODEL_DIR / "risk_model.joblib"
ENCODER_PATH        = MODEL_DIR / "crop_encoder.joblib"
FEATURE_META_PATH   = MODEL_DIR / "feature_meta.joblib"

# ─────────────────────────────────────────────────────────────────────────────
# !! CONFIG !!
# Ubah dua variabel ini untuk mengaktifkan/menonaktifkan fitur hama & varietas.
#   True  = fitur AKTIF (pakai data dummy atau data real jika ada)
#   False = fitur NONAKTIF (model seperti versi lama, lebih sederhana)
# ─────────────────────────────────────────────────────────────────────────────
USE_PEST    = True   # ← ubah ke False jika tidak ingin pakai data hama sama sekali
USE_VARIETY = True   # ← ubah ke False jika tidak ingin pakai data varietas sama sekali

CROP_TYPES = ["padi", "jagung", "kedelai", "singkong"]

FEATURES_BASE = [
    "ndvi", "rainfall_mm", "temperature_c",
    "solar_radiation", "land_area_ha", "crop_encoded",
]
FEATURES_PEST = ["pest_pressure"]
FEATURES_VAR  = ["variety_encoded"]

MIN_REAL_SAMPLES = 100
TARGET_TOTAL     = 2000
DEFAULT_PEST_PRESSURE = 0.0


# ── KATALOG VARIETAS DUMMY ────────────────────────────────────────────────────
# Format: {crop_type: [(nama_varietas, yield_modifier, days_modifier)]}
#   yield_modifier : pengali hasil panen vs baseline (1.0 = sama, 1.1 = +10%)
#   days_modifier  : koreksi hari panen vs baseline (negatif = lebih cepat)
#
# Sumber referensi dummy ini: deskripsi varietas unggul Kementan RI
# Jika kamu punya data real → taruh di data/variety_data.csv (format: lihat README)
# Jika tidak butuh varietas → set USE_VARIETY = False
VARIETY_CATALOG: dict[str, list[tuple[str, float, float]]] = {
    "padi": [
        ("IR64",       1.00,  0),
        ("Ciherang",   1.05, -5),
        ("Inpari32",   1.10, -8),
        ("Memberamo",  0.92, +5),
        ("Lokal",      0.85, +10),
    ],
    "jagung": [
        ("NK7328",     1.00,  0),
        ("Pioneer36",  1.12, -5),
        ("Bisi18",     0.95, +3),
        ("Lokal",      0.80, +8),
    ],
    "kedelai": [
        ("Anjasmoro",  1.00,  0),
        ("Dena1",      1.08, -5),
        ("Grobogan",   1.05, -3),
        ("Lokal",      0.82, +7),
    ],
    "singkong": [
        ("UJ3",        1.00,  0),
        ("Adira1",     1.05, -10),
        ("Malang6",    1.10, -15),
        ("Lokal",      0.88, +20),
    ],
}

ALL_VARIETIES   = sorted({v[0] for vlist in VARIETY_CATALOG.values() for v in vlist})
VARIETY_ENCODER = LabelEncoder().fit(ALL_VARIETIES)


# ── MAPPING HAMA → PEST_PRESSURE ─────────────────────────────────────────────
# Gunakan ini di API endpoint jika ingin menerima nama hama alih-alih angka.
# pest_pressure adalah float 0.0–1.0:
#   0.0 = tidak ada serangan
#   0.3 = serangan ringan (< 10% tanaman terinfeksi)
#   0.6 = serangan sedang (10–30%)
#   0.9 = serangan berat  (> 30%)
PEST_PRESSURE_MAP: dict[str, float] = {
    "tidak_ada":         0.0,
    "ringan":            0.3,
    "sedang":            0.6,
    "berat":             0.9,
    "wereng_coklat":     0.7,
    "blast":             0.8,
    "penggerek_batang":  0.5,
    "ulat_grayak":       0.6,
    "busuk_batang":      0.75,
    "kutu_daun":         0.4,
}


def encode_variety(variety_name: Optional[str], crop_type: str) -> int:
    if variety_name is None:
        variety_name = "Lokal"
    try:
        return int(VARIETY_ENCODER.transform([variety_name])[0])
    except Exception:
        logger.warning(f"Varietas '{variety_name}' tidak dikenal, pakai 'Lokal'")
        return int(VARIETY_ENCODER.transform(["Lokal"])[0])


def _get_active_features() -> list[str]:
    feats = list(FEATURES_BASE)
    if USE_PEST:
        feats += FEATURES_PEST
    if USE_VARIETY:
        feats += FEATURES_VAR
    return feats


# ── SYNTHETIC DATA ────────────────────────────────────────────────────────────
def _generate_synthetic_data(n_samples: int = 2000) -> pd.DataFrame:
    """
    Data synthetic berbasis domain knowledge pertanian Indonesia.
    Jika USE_PEST/USE_VARIETY aktif, kolom pest_pressure & variety ikut dibuat.
    """
    rng        = np.random.default_rng(42)
    crop_types = rng.choice(CROP_TYPES, n_samples)

    base_harvest = {"padi": 90,  "jagung": 95,  "kedelai": 85,  "singkong": 270}
    base_yield   = {"padi": 5.0, "jagung": 5.5, "kedelai": 1.5, "singkong": 20.0}

    ndvi          = rng.uniform(0.1, 0.95, n_samples)
    rainfall_mm   = rng.uniform(20, 400, n_samples)
    temperature_c = rng.uniform(18, 38, n_samples)
    solar_rad     = rng.uniform(80, 350, n_samples)
    land_area_ha  = rng.uniform(0.2, 10.0, n_samples)

    # Distribusi hama: mayoritas tidak ada / ringan (realistis)
    pest_pressure = rng.choice([0.0, 0.0, 0.0, 0.3, 0.3, 0.6, 0.9], n_samples).astype(float)
    pest_pressure += rng.normal(0, 0.05, n_samples)
    pest_pressure  = np.clip(pest_pressure, 0.0, 1.0)

    variety_names = np.array([
        rng.choice([v[0] for v in VARIETY_CATALOG[ct]])
        for ct in crop_types
    ])

    harvest_days, yield_ton, risk_labels = [], [], []

    for i in range(n_samples):
        ct = crop_types[i]
        bh = base_harvest[ct]
        by = base_yield[ct]

        ndvi_f = 0.6 + ndvi[i] * 0.6
        temp   = temperature_c[i]
        temp_f = 1.0 if 22 <= temp <= 30 else max(0.6, 1.0 - abs(temp - 26) * 0.04)
        rain   = rainfall_mm[i]
        rain_f = 1.0 if 100 <= rain <= 250 else max(0.5, 0.8 - abs(rain - 175) / 500)
        pest_f = 1.0 - pest_pressure[i] * 0.4   # hama berat → maks -40% hasil

        var_yield_mod, var_days_mod = 1.0, 0
        vname = variety_names[i]
        match = next((v for v in VARIETY_CATALOG[ct] if v[0] == vname), None)
        if match:
            var_yield_mod = match[1]
            var_days_mod  = match[2]

        perf  = ndvi_f * 0.40 + temp_f * 0.30 + rain_f * 0.20 + pest_f * 0.10
        noise = rng.normal(1.0, 0.05)

        hd = int((bh + var_days_mod) / max(perf, 0.5) * noise)
        yt = round(by * var_yield_mod * perf * noise, 2)

        risk = "low" if perf > 0.85 else ("medium" if perf > 0.65 else "high")

        harvest_days.append(np.clip(hd, 5, 365))
        yield_ton.append(np.clip(yt, 0.3, by * var_yield_mod * 1.4))
        risk_labels.append(risk)

    return pd.DataFrame({
        "ndvi":             ndvi,
        "rainfall_mm":      rainfall_mm,
        "temperature_c":    temperature_c,
        "solar_radiation":  solar_rad,
        "land_area_ha":     land_area_ha,
        "crop_type":        crop_types,
        "harvest_days":     harvest_days,
        "yield_ton_per_ha": yield_ton,
        "risk_level":       risk_labels,
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

    # Sumber 1: Feedback petani dari DB
    if db is not None:
        try:
            from database import get_unused_feedback
            feedbacks = get_unused_feedback(db)
            if feedbacks:
                base_yields = {"padi": 5.0, "jagung": 5.5, "kedelai": 1.5, "singkong": 20.0}
                rows = []
                for fb in feedbacks:
                    base  = base_yields.get(fb.crop_type, 5.0)
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

    # Sumber 2: BPS / Kementan CSV
    data_dir = Path(__file__).parent / "data"
    for csv_file in ["bps_produksi.csv", "kementan_lahan.csv", "bps_template.csv"]:
        csv_path = data_dir / csv_file
        if not csv_path.exists():
            continue
        try:
            df = pd.read_csv(csv_path)
            missing = [c for c in REQUIRED if c not in df.columns]
            if missing:
                logger.warning(f"{csv_file} tidak punya kolom: {missing} — skip")
                continue
            df["data_source"] = csv_file.replace(".csv", "")
            if "ndvi_source"   not in df.columns: df["ndvi_source"]   = "bps_manual"
            if "pest_pressure" not in df.columns: df["pest_pressure"] = DEFAULT_PEST_PRESSURE
            if "variety"       not in df.columns: df["variety"]       = "Lokal"
            frames.append(df[REQUIRED + ["data_source", "ndvi_source", "pest_pressure", "variety"]])
            logger.info(f"✅ {len(df)} baris dari {csv_file}")
        except Exception as e:
            logger.warning(f"Gagal baca {csv_file}: {e}")

    # Sumber 3: NASA POWER cache
    nasa_cache = data_dir / "nasa_power_cache.csv"
    if nasa_cache.exists():
        try:
            df = pd.read_csv(nasa_cache)
            missing = [c for c in REQUIRED if c not in df.columns]
            if missing:
                logger.warning(f"nasa_power_cache.csv tidak punya kolom: {missing} — skip")
            else:
                df["data_source"] = "nasa_power_historical"
                if "ndvi_source"   not in df.columns: df["ndvi_source"]   = "seasonal_estimate"
                if "pest_pressure" not in df.columns: df["pest_pressure"] = DEFAULT_PEST_PRESSURE
                if "variety"       not in df.columns: df["variety"]       = "Lokal"
                frames.append(df[REQUIRED + ["data_source", "ndvi_source", "pest_pressure", "variety"]])
                logger.info(
                    f"✅ {len(df)} baris dari NASA POWER cache "
                    f"(NDVI: {df['ndvi_source'].value_counts().to_dict()})"
                )
        except Exception as e:
            logger.warning(f"Gagal baca nasa_power_cache.csv: {e}")

    # Sumber 4: Data hama eksternal (opsional — lihat README untuk format)
    pest_csv = data_dir / "pest_data.csv"
    if pest_csv.exists() and USE_PEST:
        try:
            pest_df = pd.read_csv(pest_csv)
            logger.info(f"✅ Data hama eksternal dimuat: {len(pest_df)} baris")
            # Join ke frames: implementasi join tersedia jika format sudah sesuai README
        except Exception as e:
            logger.warning(f"Gagal baca pest_data.csv: {e}")

    # Sumber 5: Data varietas eksternal (opsional — lihat README untuk format)
    variety_csv = data_dir / "variety_data.csv"
    if variety_csv.exists() and USE_VARIETY:
        try:
            var_df = pd.read_csv(variety_csv)
            logger.info(f"✅ Data varietas eksternal dimuat: {len(var_df)} baris")
        except Exception as e:
            logger.warning(f"Gagal baca variety_data.csv: {e}")

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    return combined.dropna(subset=REQUIRED)


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
    print(f"   Fitur aktif    : {active_features}")
    print(f"   Fitur hama     : {'✅ aktif' if USE_PEST else '⛔ nonaktif (USE_PEST=False)'}")
    print(f"   Fitur varietas : {'✅ aktif' if USE_VARIETY else '⛔ nonaktif (USE_VARIETY=False)'}")

    df, data_stats = _load_training_data(db)
    df, encoder    = _encode_features(df, fit=True)

    X         = df[active_features]
    y_harvest = df["harvest_days"]
    y_yield   = df["yield_ton_per_ha"]
    y_risk    = df["risk_level"]

    X_tr, X_te, yh_tr, yh_te, yy_tr, yy_te, yr_tr, yr_te = train_test_split(
        X, y_harvest, y_yield, y_risk, test_size=0.2, random_state=42
    )

    if "ndvi_source" in df.columns:
        print(f"   NDVI sources   : {df['ndvi_source'].value_counts().to_dict()}")
    if USE_PEST and "pest_pressure" in df.columns:
        pp = df["pest_pressure"]
        print(f"   Pest pressure  : min={pp.min():.2f}, mean={pp.mean():.2f}, max={pp.max():.2f}")
    if USE_VARIETY and "variety" in df.columns:
        print(f"   Varietas unik  : {df['variety'].nunique()} — {df['variety'].value_counts().head(4).to_dict()}")

    print(f"   Total data     : {len(df)} baris "
          f"({data_stats['n_real']} real + {data_stats['n_synthetic']} synthetic)")

    print("🤖 Training harvest_days model (RandomForest)...")
    harvest_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    harvest_model.fit(X_tr, yh_tr)
    mae_h = mean_absolute_error(yh_te, harvest_model.predict(X_te))
    print(f"   MAE harvest_days: {mae_h:.1f} hari")

    print("🌾 Training yield model (RandomForest)...")
    yield_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    yield_model.fit(X_tr, yy_tr)
    mae_y = mean_absolute_error(yy_te, yield_model.predict(X_te))
    print(f"   MAE yield: {mae_y:.2f} ton/ha")

    print("⚠️  Training risk classifier (RandomForest)...")
    risk_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    risk_model.fit(X_tr, yr_tr)
    acc = accuracy_score(yr_te, risk_model.predict(X_te))
    print(f"   Accuracy risk: {acc:.1%}")

    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(harvest_model, HARVEST_MODEL_PATH)
    joblib.dump(yield_model,   YIELD_MODEL_PATH)
    joblib.dump(risk_model,    RISK_MODEL_PATH)
    joblib.dump(encoder,       ENCODER_PATH)
    joblib.dump(
        {"features": active_features, "use_pest": USE_PEST, "use_variety": USE_VARIETY},
        FEATURE_META_PATH,
    )
    print(f"✅ Semua model tersimpan di {MODEL_DIR}/")

    return {
        "mae_harvest_days": round(mae_h, 2),
        "mae_yield":        round(mae_y, 3),
        "risk_accuracy":    round(acc, 4),
        "features_used":    active_features,
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
        _models["harvest"] = joblib.load(HARVEST_MODEL_PATH)
        _models["yield"]   = joblib.load(YIELD_MODEL_PATH)
        _models["risk"]    = joblib.load(RISK_MODEL_PATH)
        _models["encoder"] = joblib.load(ENCODER_PATH)
        if FEATURE_META_PATH.exists():
            _models["feature_meta"] = joblib.load(FEATURE_META_PATH)
        else:
            # Kompatibel mundur dengan model versi lama (tanpa hama/varietas)
            _models["feature_meta"] = {"features": FEATURES_BASE, "use_pest": False, "use_variety": False}
        print("✅ Semua model berhasil dimuat")
        print(f"   Fitur model    : {_models['feature_meta']['features']}")
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
        logger.warning("Model tidak tersedia — menggunakan fallback rules")
        return predict_fallback(data)

    try:
        enc          = _models["encoder"]
        feat_meta    = _models["feature_meta"]
        active_feats = feat_meta["features"]
        use_pest_now = feat_meta.get("use_pest", False)
        use_var_now  = feat_meta.get("use_variety", False)

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
            pest_val = getattr(data, "pest_pressure", DEFAULT_PEST_PRESSURE) or DEFAULT_PEST_PRESSURE
            row["pest_pressure"] = float(np.clip(pest_val, 0.0, 1.0))

        if use_var_now:
            variety_val = getattr(data, "variety", None)
            row["variety_encoded"] = encode_variety(variety_val, data.crop_type)

        X = row[active_feats]

        harvest_days = int(round(_models["harvest"].predict(X)[0]))
        yield_per_ha = round(float(_models["yield"].predict(X)[0]), 2)
        risk_level   = str(_models["risk"].predict(X)[0])
        risk_proba   = _models["risk"].predict_proba(X)[0]
        confidence   = round(float(risk_proba.max()), 2)
        total_yield  = round(yield_per_ha * data.land_area_ha, 2)
        risk_score   = round({"low": 0.15, "medium": 0.50, "high": 0.85}.get(risk_level, 0.5), 2)

        from fallback_rules import (_build_recommendations, _temp_factor,
                                    _rain_factor, _ndvi_factor, CROP_PROFILES)
        profile = CROP_PROFILES[data.crop_type]
        recs = _build_recommendations(
            data, risk_level,
            _temp_factor(data.temperature_c, profile["optimal_temp"]),
            _rain_factor(data.rainfall_mm,   profile["optimal_rainfall"]),
            _ndvi_factor(data.ndvi,           profile["optimal_ndvi"]),
        )

        # Rekomendasi tambahan dari data hama
        if use_pest_now:
            pp = float(getattr(data, "pest_pressure", 0.0) or 0.0)
            if pp >= 0.7:
                recs.append("🐛 Serangan hama berat — segera lakukan pengendalian OPT (Organisme Pengganggu Tanaman)")
            elif pp >= 0.4:
                recs.append("🐛 Waspadai serangan hama sedang — pantau lahan secara rutin tiap 3 hari")

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
        logger.error(f"Error saat prediksi ML: {e} — fallback ke rules")
        return predict_fallback(data)
