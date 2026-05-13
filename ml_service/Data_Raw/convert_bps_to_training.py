"""
convert_bps_to_training.py
--------------------------
Konversi data BPS/Kementan ke format training PanenCerdas.

Mendukung DUA format input sekaligus:

FORMAT 1 — WIDE (format asli dari website Kementan/BPS):
  Kolom tahun tersebar horizontal, nilai adalah PRODUKSI (ton).
  Contoh:
    No, Provinsi, 2021, 2022, 2023, 2024, 2025, Pertumbuhan (%)
    1,  Aceh,     1634639, 1509456, ...

FORMAT 2 — LONG (format standar dengan satu baris per data):
  Contoh:
    provinsi, tahun, produksi_ton, luas_panen_ha
    Jawa Timur, 2023, 9647658, 1788518

Cara pakai:
  python convert_bps_to_training.py --input padi_kementan.csv --crop padi
  python convert_bps_to_training.py --input padi.csv jagung.csv kedelai.csv
  python convert_bps_to_training.py --input padi_prod.csv --luas padi_luas.csv --crop padi
  python convert_bps_to_training.py --input data.csv --no-nasa
  python convert_bps_to_training.py --input data.csv --crop padi --dry-run
"""

import argparse
import re
import sys
import asyncio
import logging
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

PROVINSI_COORDS = {
    "ACEH":                          ( 4.69,  96.75),
    "SUMATERA UTARA":                ( 2.10,  99.54),
    "SUMATERA BARAT":                (-0.74, 100.80),
    "RIAU":                          ( 0.29, 101.70),
    "KEPULAUAN RIAU":                ( 3.94, 108.14),
    "JAMBI":                         (-1.61, 103.61),
    "SUMATERA SELATAN":              (-3.32, 103.91),
    "BENGKULU":                      (-3.80, 102.27),
    "LAMPUNG":                       (-4.56, 105.40),
    "KEPULAUAN BANGKA BELITUNG":     (-2.74, 106.44),
    "DAERAH KHUSUS IBUKOTA JAKARTA": (-6.21, 106.85),
    "DKI JAKARTA":                   (-6.21, 106.85),
    "JAWA BARAT":                    (-6.90, 107.62),
    "JAWA TENGAH":                   (-7.15, 110.14),
    "DAERAH ISTIMEWA YOGYAKARTA":    (-7.80, 110.36),
    "JAWA TIMUR":                    (-7.54, 112.24),
    "BANTEN":                        (-6.40, 106.09),
    "BALI":                          (-8.40, 115.19),
    "NUSA TENGGARA BARAT":           (-8.65, 117.36),
    "NUSA TENGGARA TIMUR":           (-8.66, 121.08),
    "KALIMANTAN BARAT":              ( 0.13, 111.09),
    "KALIMANTAN TENGAH":             (-1.68, 113.38),
    "KALIMANTAN SELATAN":            (-3.33, 115.28),
    "KALIMANTAN TIMUR":              ( 0.44, 116.98),
    "KALIMANTAN UTARA":              ( 3.07, 116.04),
    "SULAWESI UTARA":                ( 0.62, 123.97),
    "SULAWESI TENGAH":               (-1.43, 121.45),
    "SULAWESI SELATAN":              (-3.67, 119.97),
    "SULAWESI TENGGARA":             (-3.97, 122.51),
    "GORONTALO":                     ( 0.54, 123.06),
    "SULAWESI BARAT":                (-2.84, 119.24),
    "MALUKU":                        (-3.24, 130.14),
    "MALUKU UTARA":                  ( 1.57, 127.81),
    "PAPUA BARAT":                   (-1.33, 133.17),
    "PAPUA BARAT DAYA":              (-1.33, 133.17),
    "PAPUA":                         (-4.27, 138.08),
    "PAPUA TENGAH":                  (-3.99, 136.38),
    "PAPUA PEGUNUNGAN":              (-4.00, 139.00),
    "PAPUA SELATAN":                 (-6.50, 140.50),
}

# Estimasi luas panen per provinsi per crop (ha) — dipakai saat tidak ada file luas
# Sumber: BPS rata-rata 2020-2024
LUAS_PANEN_PROVINSI = {
    # ── PADI ──────────────────────────────────────────────────────────────────
    ("ACEH",                       "padi"):           180_000,
    ("SUMATERA UTARA",             "padi"):           440_000,
    ("SUMATERA BARAT",             "padi"):           210_000,
    ("RIAU",                       "padi"):            55_000,
    ("JAMBI",                      "padi"):            65_000,
    ("SUMATERA SELATAN",           "padi"):           530_000,
    ("BENGKULU",                   "padi"):            85_000,
    ("LAMPUNG",                    "padi"):           340_000,
    ("JAWA BARAT",                 "padi"):           870_000,
    ("JAWA TENGAH",                "padi"):           950_000,
    ("DAERAH ISTIMEWA YOGYAKARTA", "padi"):            60_000,
    ("JAWA TIMUR",                 "padi"):         1_800_000,
    ("BANTEN",                     "padi"):           165_000,
    ("BALI",                       "padi"):            80_000,
    ("NUSA TENGGARA BARAT",        "padi"):           240_000,
    ("NUSA TENGGARA TIMUR",        "padi"):            90_000,
    ("KALIMANTAN BARAT",           "padi"):           310_000,
    ("KALIMANTAN TENGAH",          "padi"):           140_000,
    ("KALIMANTAN SELATAN",         "padi"):           480_000,
    ("KALIMANTAN TIMUR",           "padi"):            40_000,
    ("SULAWESI UTARA",             "padi"):            55_000,
    ("SULAWESI TENGAH",            "padi"):           100_000,
    ("SULAWESI SELATAN",           "padi"):           560_000,
    ("SULAWESI TENGGARA",          "padi"):            75_000,
    ("GORONTALO",                  "padi"):            40_000,
    ("SULAWESI BARAT",             "padi"):            55_000,
    # ── JAGUNG ────────────────────────────────────────────────────────────────
    ("JAWA TIMUR",                 "jagung"):       1_200_000,
    ("JAWA TENGAH",                "jagung"):         500_000,
    ("LAMPUNG",                    "jagung"):         700_000,
    ("SULAWESI SELATAN",           "jagung"):         450_000,
    ("SUMATERA UTARA",             "jagung"):         340_000,
    ("NUSA TENGGARA TIMUR",        "jagung"):         300_000,
    ("GORONTALO",                  "jagung"):         200_000,
    # ── KEDELAI ───────────────────────────────────────────────────────────────
    ("JAWA TIMUR",                 "kedelai"):        200_000,
    ("JAWA TENGAH",                "kedelai"):        160_000,
    ("JAWA BARAT",                 "kedelai"):        130_000,
    ("NUSA TENGGARA BARAT",        "kedelai"):         80_000,
    # ── UBI KAYU ──────────────────────────────────────────────────────────────
    ("LAMPUNG",                    "ubi_kayu"):       330_000,
    ("JAWA TIMUR",                 "ubi_kayu"):       190_000,
    ("JAWA TENGAH",                "ubi_kayu"):       170_000,
    ("JAWA BARAT",                 "ubi_kayu"):       100_000,
    ("SUMATERA UTARA",             "ubi_kayu"):        80_000,
    # ── UBI JALAR ─────────────────────────────────────────────────────────────
    ("JAWA BARAT",                 "ubi_jalar"):       35_000,
    ("PAPUA",                      "ubi_jalar"):       50_000,
    ("JAWA TENGAH",                "ubi_jalar"):       20_000,
    ("JAWA TIMUR",                 "ubi_jalar"):       15_000,
    ("SUMATERA UTARA",             "ubi_jalar"):       12_000,
    # ── CABE BESAR ────────────────────────────────────────────────────────────
    ("JAWA BARAT",                 "cabe_besar"):      35_000,
    ("JAWA TENGAH",                "cabe_besar"):      30_000,
    ("JAWA TIMUR",                 "cabe_besar"):      25_000,
    ("SUMATERA BARAT",             "cabe_besar"):      15_000,
    ("SULAWESI SELATAN",           "cabe_besar"):      10_000,
    # ── CABE RAWIT ────────────────────────────────────────────────────────────
    ("JAWA TIMUR",                 "cabe_rawit"):      60_000,
    ("JAWA TENGAH",                "cabe_rawit"):      40_000,
    ("NUSA TENGGARA BARAT",        "cabe_rawit"):      20_000,
    ("SULAWESI UTARA",             "cabe_rawit"):      10_000,
    ("KALIMANTAN BARAT",           "cabe_rawit"):       8_000,
    # ── BAWANG MERAH ──────────────────────────────────────────────────────────
    ("JAWA TENGAH",                "bawang_merah"):    45_000,
    ("JAWA TIMUR",                 "bawang_merah"):    25_000,
    ("NUSA TENGGARA BARAT",        "bawang_merah"):    20_000,
    ("JAWA BARAT",                 "bawang_merah"):    10_000,
    ("SUMATERA BARAT",             "bawang_merah"):     8_000,
    # ── BAWANG PUTIH ──────────────────────────────────────────────────────────
    ("JAWA TENGAH",                "bawang_putih"):     5_000,
    ("NUSA TENGGARA BARAT",        "bawang_putih"):     3_500,
    ("JAWA TIMUR",                 "bawang_putih"):     2_000,
    ("SUMATERA UTARA",             "bawang_putih"):     1_500,
    ("JAWA BARAT",                 "bawang_putih"):     1_000,
}

LUAS_FALLBACK = {
    "padi":         200_000,
    "jagung":       300_000,
    "kedelai":      100_000,
    "ubi_kayu":     200_000,
    "ubi_jalar":     20_000,
    "cabe_besar":    20_000,
    "cabe_rawit":    30_000,
    "bawang_merah":  15_000,
    "bawang_putih":   3_000,
}

# 9 komoditas lengkap
CROP_REFERENCE = {
    "padi":         {"harvest_days": 110, "baseline_yield":  5.2,  "yield_std": 1.0},
    "jagung":       {"harvest_days": 100, "baseline_yield":  5.5,  "yield_std": 1.0},
    "kedelai":      {"harvest_days":  88, "baseline_yield":  1.5,  "yield_std": 0.3},
    "ubi_kayu":     {"harvest_days": 270, "baseline_yield": 19.5,  "yield_std": 3.0},
    "ubi_jalar":    {"harvest_days": 120, "baseline_yield": 12.0,  "yield_std": 2.0},
    "cabe_besar":   {"harvest_days":  90, "baseline_yield":  8.0,  "yield_std": 1.5},
    "cabe_rawit":   {"harvest_days":  85, "baseline_yield":  6.0,  "yield_std": 1.2},
    "bawang_merah": {"harvest_days":  60, "baseline_yield": 10.0,  "yield_std": 2.0},
    "bawang_putih": {"harvest_days":  95, "baseline_yield":  7.0,  "yield_std": 1.5},
}

CROP_NAME_MAP = {
    # ── PADI ──────────────────────────────────────────────────────────────────
    "padi":                "padi",
    "padi sawah":          "padi",
    "padi ladang":         "padi",
    "padi (sawah)":        "padi",
    "padi (ladang)":       "padi",
    # ── JAGUNG ────────────────────────────────────────────────────────────────
    "jagung":              "jagung",
    "jagung hibrida":      "jagung",
    # ── KEDELAI ───────────────────────────────────────────────────────────────
    "kedelai":             "kedelai",
    "kacang kedelai":      "kedelai",
    # ── UBI KAYU ──────────────────────────────────────────────────────────────
    "ubi kayu":            "ubi_kayu",
    "singkong":            "ubi_kayu",
    "ketela pohon":        "ubi_kayu",
    "ubi kayu (singkong)": "ubi_kayu",
    "ubi kayu/singkong":   "ubi_kayu",
    # ── UBI JALAR ─────────────────────────────────────────────────────────────
    "ubi jalar":           "ubi_jalar",
    "ketela rambat":       "ubi_jalar",
    # ── CABE BESAR ────────────────────────────────────────────────────────────
    "cabe besar":          "cabe_besar",
    "cabai besar":         "cabe_besar",
    "cabe merah":          "cabe_besar",
    "cabai merah":         "cabe_besar",
    "cabai merah besar":   "cabe_besar",
    "cabe merah besar":    "cabe_besar",
    # ── CABE RAWIT ────────────────────────────────────────────────────────────
    "cabe rawit":          "cabe_rawit",
    "cabai rawit":         "cabe_rawit",
    # ── BAWANG MERAH ──────────────────────────────────────────────────────────
    "bawang merah":        "bawang_merah",
    "bawang merah (umbi)": "bawang_merah",
    # ── BAWANG PUTIH ──────────────────────────────────────────────────────────
    "bawang putih":        "bawang_putih",
    "bawang putih (umbi)": "bawang_putih",
}

INDONESIA_DEFAULTS = {"temperature_c": 27.0, "rainfall_mm": 150.0, "solar_radiation": 185.0}

# ── NDVI BASELINE PER CROP (musim hujan vs kemarau) ──────────────────────────
# Sinkron dengan data_fetcher.NDVI_BASE — update keduanya jika ada perubahan.
# Nilai berdasarkan karakteristik kanopi tanaman Indonesia.
NDVI_BASE = {
    #                   musim_hujan  musim_kemarau
    "padi":            (0.72,        0.58),
    "jagung":          (0.65,        0.52),
    "kedelai":         (0.60,        0.48),
    "ubi_kayu":        (0.65,        0.52),
    "ubi_jalar":       (0.62,        0.50),
    "cabe_besar":      (0.55,        0.44),
    "cabe_rawit":      (0.52,        0.42),
    "bawang_merah":    (0.45,        0.38),
    "bawang_putih":    (0.42,        0.36),
}
NDVI_FALLBACK = (0.58, 0.48)

# Bulan puncak kanopi per crop — proxy musim tanam utama.
# Bulan hujan Indonesia: Okt–Mar → wet_season; Apr–Sep → dry_season.
CROP_PEAK_MONTH = {
    "padi":         11,   # tanam awal musim hujan, puncak Nov-Des
    "jagung":        4,   # MT-2 (Mar-Jun), puncak Apr
    "kedelai":       4,   # MT-2 (Mar-Jun), puncak Apr-Mei
    "ubi_kayu":      8,   # tanam sepanjang tahun, tengah musim kemarau
    "ubi_jalar":     3,   # transisi hujan→kemarau
    "cabe_besar":    2,   # dominan tanam Okt-Jan, puncak Feb
    "cabe_rawit":    2,
    "bawang_merah":  7,   # dominan kemarau (Jun-Agt)
    "bawang_putih":  7,
}

# Pilihan valid untuk argumen --crop
VALID_CROPS = list(CROP_REFERENCE.keys())


def normalize_provinsi(name):
    name = str(name).strip().upper()
    aliases = {
        "YOGYAKARTA":        "DAERAH ISTIMEWA YOGYAKARTA",
        "D.I. YOGYAKARTA":   "DAERAH ISTIMEWA YOGYAKARTA",
        "DI YOGYAKARTA":     "DAERAH ISTIMEWA YOGYAKARTA",
        "D.I YOGYAKARTA":    "DAERAH ISTIMEWA YOGYAKARTA",
        "JAKARTA":           "DAERAH KHUSUS IBUKOTA JAKARTA",
        "DKI JAKARTA":       "DAERAH KHUSUS IBUKOTA JAKARTA",
        "D.K.I. JAKARTA":    "DAERAH KHUSUS IBUKOTA JAKARTA",
        "IRIAN JAYA":        "PAPUA",
        "NTB":               "NUSA TENGGARA BARAT",
        "NTT":               "NUSA TENGGARA TIMUR",
        "KALBAR":            "KALIMANTAN BARAT",
        "KALTENG":           "KALIMANTAN TENGAH",
        "KALSEL":            "KALIMANTAN SELATAN",
        "KALTIM":            "KALIMANTAN TIMUR",
        "KALTARA":           "KALIMANTAN UTARA",
        "SULUT":             "SULAWESI UTARA",
        "SULTENG":           "SULAWESI TENGAH",
        "SULSEL":            "SULAWESI SELATAN",
        "SULTRA":            "SULAWESI TENGGARA",
        "SULBAR":            "SULAWESI BARAT",
        "SUMUT":             "SUMATERA UTARA",
        "SUMBAR":            "SUMATERA BARAT",
        "SUMSEL":            "SUMATERA SELATAN",
        "KEPRI":             "KEPULAUAN RIAU",
        "BABEL":             "KEPULAUAN BANGKA BELITUNG",
        "PAPUA BARAT DAYA":  "PAPUA BARAT",
    }
    return aliases.get(name, name)


def normalize_crop(name):
    return CROP_NAME_MAP.get(str(name).strip().lower(), str(name).strip().lower())


def parse_number(val):
    """
    Parse angka dari berbagai format BPS:
    - "1,634,639.60"  -> 1634639.60  (ribuan koma, desimal titik)
    - "1.634.639,60"  -> 1634639.60  (ribuan titik, desimal koma)
    - " -2.7%"        -> NaN          (persen diabaikan)
    """
    if pd.isna(val):
        return float("nan")
    s = str(val).strip()
    if not s or s in ("-", "—", "n/a", "N/A", "*", "..."):
        return float("nan")
    s = re.sub(r"[%\s]", "", s)
    if not s or s in ("-", "+"):
        return float("nan")
    # Ribuan koma + desimal titik: 1,234,567.89
    if re.match(r"^-?\d{1,3}(,\d{3})*(\.\d+)?$", s):
        return float(s.replace(",", ""))
    # Ribuan titik + desimal koma: 1.234.567,89
    if re.match(r"^-?\d{1,3}(\.\d{3})*(,\d+)?$", s):
        return float(s.replace(".", "").replace(",", "."))
    try:
        return float(s.replace(",", ""))
    except ValueError:
        return float("nan")


def detect_year_columns(df):
    """Deteksi kolom yang merupakan tahun (2000-2035) untuk format wide."""
    return sorted([
        int(str(c).strip())
        for c in df.columns
        if re.match(r"^20[0-2]\d$", str(c).strip())
    ])


def is_wide_format(df):
    return len(detect_year_columns(df)) >= 2


def detect_long_columns(df):
    col_map = {}
    cols_lower = {str(c).lower().strip(): c for c in df.columns}

    for cand in ["provinsi", "province", "wilayah", "nama_provinsi", "nama provinsi"]:
        if cand in cols_lower: col_map["provinsi"] = cols_lower[cand]; break
    for cand in ["tahun", "year", "periode"]:
        if cand in cols_lower: col_map["tahun"] = cols_lower[cand]; break
    for cand in ["crop_type", "jenis_tanaman", "komoditas", "tanaman", "jenis tanaman"]:
        if cand in cols_lower: col_map["crop_type"] = cols_lower[cand]; break
    for cand in ["produksi_ton", "produksi", "production_ton", "total_produksi",
                  "produksi (ton)", "jumlah produksi"]:
        if cand in cols_lower: col_map["produksi_ton"] = cols_lower[cand]; break
    for cand in ["luas_panen_ha", "luas_panen", "area_ha", "luas panen",
                  "luas panen (ha)", "luas_panen (ha)"]:
        if cand in cols_lower: col_map["luas_panen_ha"] = cols_lower[cand]; break
    for cand in ["yield_ton_per_ha", "produktivitas", "yield",
                  "produktivitas (ton/ha)", "produktivitas_ton_ha"]:
        if cand in cols_lower: col_map["yield_ton_per_ha"] = cols_lower[cand]; break

    return col_map


# ── FORMAT WIDE ───────────────────────────────────────────────────────────────

def load_wide_format(df, crop_type, filepath):
    year_cols = detect_year_columns(df)
    logger.info(f"  [WIDE] Kolom tahun: {year_cols}")

    cols_lower = {str(c).lower().strip(): c for c in df.columns}
    prov_col = None
    for cand in ["provinsi", "province", "wilayah", "nama_provinsi", "nama provinsi"]:
        if cand in cols_lower:
            prov_col = cols_lower[cand]
            break
    if prov_col is None:
        non_year = [c for c in df.columns if not re.match(r"^20[0-2]\d$", str(c).strip())]
        prov_col = non_year[1] if len(non_year) > 1 else non_year[0]
        logger.warning(f"  Kolom provinsi tidak ditemukan, pakai kolom: '{prov_col}'")

    actual_year_cols = [c for c in df.columns if str(c).strip() in [str(y) for y in year_cols]]
    df_sub = df[[prov_col] + actual_year_cols].copy().rename(columns={prov_col: "provinsi"})

    SKIP_RE = re.compile(
        r"(total|jumlah|indonesia|nasional|rata.rata|keterangan|sumber|^\s*$|^\s*no\s*$)",
        re.IGNORECASE
    )
    df_sub = df_sub[~df_sub["provinsi"].astype(str).str.match(SKIP_RE)]
    df_sub = df_sub[df_sub["provinsi"].astype(str).str.strip().ne("")]

    df_long = df_sub.melt(id_vars="provinsi", var_name="tahun", value_name="produksi_ton")
    df_long["tahun"]        = df_long["tahun"].astype(str).str.strip().astype(int)
    df_long["produksi_ton"] = df_long["produksi_ton"].apply(parse_number)
    df_long = df_long.dropna(subset=["produksi_ton"])
    df_long = df_long[df_long["produksi_ton"] > 0]
    df_long["provinsi"]  = df_long["provinsi"].apply(normalize_provinsi)
    df_long["crop_type"] = crop_type

    logger.info(f"  Wide -> Long: {len(df_long)} baris "
                f"({df_long['provinsi'].nunique()} provinsi x {len(year_cols)} tahun)")
    return df_long[["provinsi", "tahun", "produksi_ton", "crop_type"]]


# ── FORMAT LONG ───────────────────────────────────────────────────────────────

def load_long_format(df, crop_type, filepath):
    col_map = detect_long_columns(df)
    logger.info(f"  [LONG] Kolom: {col_map}")

    if "provinsi" not in col_map:
        raise ValueError(
            f"Kolom provinsi tidak ditemukan di {filepath}.\n"
            f"Kolom yang ada: {list(df.columns)}"
        )

    result = pd.DataFrame()
    result["provinsi"] = df[col_map["provinsi"]].apply(normalize_provinsi)

    if "tahun" in col_map:
        result["tahun"] = pd.to_numeric(df[col_map["tahun"]], errors="coerce").fillna(2023).astype(int)
    else:
        result["tahun"] = 2023
        logger.warning("  Kolom tahun tidak ditemukan -> pakai 2023")

    if "crop_type" in col_map:
        result["crop_type"] = df[col_map["crop_type"]].apply(normalize_crop)
    elif crop_type:
        result["crop_type"] = crop_type
    else:
        fname = Path(filepath).stem.lower()
        guessed = next(
            (c for c in VALID_CROPS if c.replace("_", "") in fname.replace(" ", "").replace("_", "")),
            None
        )
        # Tangani alias nama file yang umum
        if guessed is None:
            fname_aliases = {
                "singkong":    "ubi_kayu",
                "ketela":      "ubi_kayu",
                "ubijalar":    "ubi_jalar",
                "cabebesar":   "cabe_besar",
                "cabaibesar":  "cabe_besar",
                "cabemerah":   "cabe_besar",
                "caberawit":   "cabe_rawit",
                "cabairawit":  "cabe_rawit",
                "bawangmerah": "bawang_merah",
                "bawangputih": "bawang_putih",
            }
            for alias, crop in fname_aliases.items():
                if alias in fname.replace(" ", "").replace("_", ""):
                    guessed = crop
                    break
        if guessed:
            result["crop_type"] = guessed
            logger.info(f"  crop_type ditebak dari nama file: {guessed}")
        else:
            raise ValueError(
                f"Crop type tidak diketahui untuk {filepath}.\n"
                f"Gunakan --crop dengan salah satu: {', '.join(VALID_CROPS)}"
            )

    if "yield_ton_per_ha" in col_map:
        result["yield_ton_per_ha"] = df[col_map["yield_ton_per_ha"]].apply(parse_number)
    elif "produksi_ton" in col_map and "luas_panen_ha" in col_map:
        prod = df[col_map["produksi_ton"]].apply(parse_number)
        luas = df[col_map["luas_panen_ha"]].apply(parse_number)
        result["produksi_ton"]     = prod
        result["luas_panen_ha"]    = luas
        result["yield_ton_per_ha"] = (prod / luas).round(3)
        logger.info("  yield = produksi / luas panen (eksak)")
    elif "produksi_ton" in col_map:
        result["produksi_ton"] = df[col_map["produksi_ton"]].apply(parse_number)
        logger.info("  Hanya produksi — yield akan dihitung dari estimasi luas")
    else:
        raise ValueError(
            f"Tidak bisa menghitung yield di {filepath}.\n"
            f"Butuh: 'yield_ton_per_ha', atau 'produksi_ton'+'luas_panen_ha', atau minimal 'produksi_ton'."
        )
    return result


def compute_yield_from_produksi(df):
    """Hitung yield dari produksi + estimasi luas panen untuk baris yang belum punya yield."""
    if "yield_ton_per_ha" in df.columns and df["yield_ton_per_ha"].notna().all():
        return df
    df = df.copy()
    if "yield_ton_per_ha" not in df.columns:
        df["yield_ton_per_ha"] = float("nan")
    if "luas_panen_ha" not in df.columns:
        df["luas_panen_ha"] = float("nan")

    mask = df["yield_ton_per_ha"].isna() & df.get("produksi_ton", pd.Series(dtype=float)).notna()
    for idx in df[mask].index:
        prov = df.at[idx, "provinsi"]
        ct   = df.at[idx, "crop_type"]
        prod = df.at[idx, "produksi_ton"]
        luas = LUAS_PANEN_PROVINSI.get((prov, ct), LUAS_FALLBACK.get(ct, 20_000))
        df.at[idx, "yield_ton_per_ha"] = round(prod / luas, 3)
        df.at[idx, "luas_panen_ha"]    = luas

    n = mask.sum()
    if n > 0:
        logger.info(f"  {n} baris yield dihitung dari estimasi luas panen (tambahkan --luas untuk akurasi lebih tinggi)")
    return df


def load_and_normalize(filepath, crop_type=None, luas_filepath=None):
    logger.info(f"\nMemuat: {filepath}")
    df = pd.read_csv(filepath, dtype=str)
    logger.info(f"  {len(df)} baris, kolom: {list(df.columns)}")

    if is_wide_format(df):
        if crop_type is None:
            fname = Path(filepath).stem.lower().replace(" ", "").replace("_", "")
            crop_type = next(
                (c for c in VALID_CROPS if c.replace("_", "") in fname),
                None
            )
            if crop_type is None:
                fname_aliases = {
                    "singkong":    "ubi_kayu",
                    "ketela":      "ubi_kayu",
                    "ubijalar":    "ubi_jalar",
                    "cabebesar":   "cabe_besar",
                    "cabaibesar":  "cabe_besar",
                    "cabemerah":   "cabe_besar",
                    "caberawit":   "cabe_rawit",
                    "cabairawit":  "cabe_rawit",
                    "bawangmerah": "bawang_merah",
                    "bawangputih": "bawang_putih",
                }
                for alias, crop in fname_aliases.items():
                    if alias in fname:
                        crop_type = crop
                        break
        if crop_type is None:
            raise ValueError(
                f"File {filepath} format wide (kolom tahun) tapi crop_type tidak diketahui.\n"
                f"Gunakan --crop dengan salah satu: {', '.join(VALID_CROPS)}"
            )
        crop_type = normalize_crop(crop_type)
        result = load_wide_format(df, crop_type, filepath)
    else:
        result = load_long_format(df, crop_type, filepath)

    # Merge luas panen dari file terpisah jika ada
    if luas_filepath and Path(luas_filepath).exists():
        logger.info(f"  Merge luas panen dari: {luas_filepath}")
        df_luas = pd.read_csv(luas_filepath, dtype=str)

        if is_wide_format(df_luas):
            logger.info("  [LUAS] Format WIDE terdeteksi → konversi ke LONG")

            year_cols = detect_year_columns(df_luas)
            cols_lower = {str(c).lower().strip(): c for c in df_luas.columns}
            prov_col = None
            for cand in ["provinsi", "province", "wilayah", "nama_provinsi"]:
                if cand in cols_lower:
                    prov_col = cols_lower[cand]
                    break

            if prov_col is None:
                raise ValueError("Kolom provinsi tidak ditemukan di file luas")

            df_luas_long = df_luas[[prov_col] + [str(y) for y in year_cols]].copy()
            df_luas_long = df_luas_long.rename(columns={prov_col: "provinsi"})
            df_luas_long = df_luas_long.melt(
                id_vars="provinsi",
                var_name="tahun",
                value_name="luas_panen_ha"
            )
            df_luas_long["tahun"]        = df_luas_long["tahun"].astype(int)
            df_luas_long["luas_panen_ha"] = df_luas_long["luas_panen_ha"].apply(parse_number)
            df_luas_long["provinsi"]     = df_luas_long["provinsi"].apply(normalize_provinsi)

        else:
            logger.info("  [LUAS] Format LONG terdeteksi")
            col_luas = detect_long_columns(df_luas)

            if "provinsi" not in col_luas or "luas_panen_ha" not in col_luas:
                logger.warning("  File luas tidak punya kolom yang dikenali — skip")
                df_luas_long = None
            else:
                df_luas_long = pd.DataFrame({
                    "provinsi": df_luas[col_luas["provinsi"]].apply(normalize_provinsi),
                    "tahun": pd.to_numeric(
                        df_luas[col_luas["tahun"]] if "tahun" in col_luas else "2023",
                        errors="coerce"
                    ).fillna(2023).astype(int),
                    "luas_panen_ha": df_luas[col_luas["luas_panen_ha"]].apply(parse_number),
                })

        if df_luas_long is not None:
            result = result.merge(df_luas_long, on=["provinsi", "tahun"], how="left", suffixes=("", "_ext"))
            if "luas_panen_ha_ext" in result.columns:
                result["luas_panen_ha"] = result["luas_panen_ha"].combine_first(result["luas_panen_ha_ext"])
                result = result.drop(columns=["luas_panen_ha_ext"])

    result = compute_yield_from_produksi(result)
    result = result.dropna(subset=["yield_ton_per_ha", "provinsi"])
    result = result[result["yield_ton_per_ha"] > 0]
    result = result[result["yield_ton_per_ha"] < 100]  # buang outlier ekstrem
    logger.info(f"  Hasil akhir: {len(result)} baris valid")
    return result


# ── ENRICH ───────────────────────────────────────────────────────────────────

def compute_risk(yield_val, crop_type):
    ref   = CROP_REFERENCE.get(crop_type, CROP_REFERENCE["padi"])
    ratio = yield_val / ref["baseline_yield"] if ref["baseline_yield"] > 0 else 1.0
    return "low" if ratio >= 0.85 else ("medium" if ratio >= 0.65 else "high")


def estimate_ndvi_bps(crop_type: str, provinsi: str) -> float:
    """
    Estimasi NDVI untuk data training BPS historis.

    Karena data BPS tidak punya info bulan tanam spesifik, pakai
    CROP_PEAK_MONTH sebagai proxy bulan puncak kanopi per crop, lalu
    tentukan apakah itu musim hujan atau kemarau.

    Bonus: provinsi di Jawa & Bali dengan irigasi lebih baik mendapat
    koreksi +0.05 (pangan pokok) atau +0.02 (hortikultura).
    """
    month  = CROP_PEAK_MONTH.get(crop_type, 6)
    is_wet = month in (10, 11, 12, 1, 2, 3)

    wet_ndvi, dry_ndvi = NDVI_BASE.get(crop_type, NDVI_FALLBACK)
    ndvi = wet_ndvi if is_wet else dry_ndvi

    coord = PROVINSI_COORDS.get(provinsi)
    if coord:
        lat, lon = coord
        is_java_bali = (-9 <= lat <= -5) and (105 <= lon <= 116)
        hortikultura = crop_type in ("cabe_besar", "cabe_rawit", "bawang_merah", "bawang_putih")
        if is_java_bali:
            ndvi += 0.02 if hortikultura else 0.05

    return round(min(ndvi, 0.95), 2)


def enrich_with_static_values(df):
    df = df.copy()
    df["harvest_days"] = df["crop_type"].map(
        {k: v["harvest_days"] for k, v in CROP_REFERENCE.items()}
    ).fillna(110).astype(int)
    df["risk_level"]   = df.apply(lambda r: compute_risk(r["yield_ton_per_ha"], r["crop_type"]), axis=1)
    df["ndvi"]         = df.apply(
        lambda r: estimate_ndvi_bps(r["crop_type"], r["provinsi"]), axis=1
    )
    df["ndvi_source"]  = "seasonal_estimate"
    df["land_area_ha"] = 2.0
    df["data_source"]  = "bps_kementan"
    return df


def enrich_with_nasa(df):
    try:
        import httpx, datetime

        async def fetch_one(lat, lon, year):
            try:
                current_year = datetime.date.today().year
                yr = year if year < current_year else current_year - 1
                params = {
                    "parameters": "T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN",
                    "community":  "AG",
                    "longitude":  lon,
                    "latitude":   lat,
                    "start":      f"{yr}0101",
                    "end":        f"{yr}1231",
                    "format":     "JSON",
                }
                async with httpx.AsyncClient(timeout=40) as client:
                    r = await client.get(
                        "https://power.larc.nasa.gov/api/temporal/daily/point",
                        params=params
                    )
                    r.raise_for_status()
                    p   = r.json()["properties"]["parameter"]
                    t   = [v for v in p["T2M"].values()               if v != -999]
                    rn  = [v for v in p["PRECTOTCORR"].values()       if v != -999]
                    sol = [v for v in p["ALLSKY_SFC_SW_DWN"].values() if v != -999]
                    return {
                        "temperature_c":   round(sum(t)  / len(t),    1) if t   else INDONESIA_DEFAULTS["temperature_c"],
                        "rainfall_mm":     round(sum(rn) / len(rn) * 30, 1) if rn  else INDONESIA_DEFAULTS["rainfall_mm"],
                        "solar_radiation": round(sum(sol)/ len(sol),  1) if sol else INDONESIA_DEFAULTS["solar_radiation"],
                        "data_source": "nasa_power",
                    }
            except Exception as e:
                logger.warning(f"  NASA POWER gagal ({lat:.2f},{lon:.2f},{year}): {e}")
                return {**INDONESIA_DEFAULTS, "data_source": "default_fallback"}

        async def fetch_all(combos):
            sem = asyncio.Semaphore(5)
            async def _one(lat, lon, yr):
                async with sem:
                    return await fetch_one(lat, lon, yr)
            return await asyncio.gather(*[_one(lat, lon, yr) for lat, lon, yr in combos])

        unique = df[["provinsi", "tahun"]].drop_duplicates()
        combos, keys = [], []
        for _, row in unique.iterrows():
            prov  = row["provinsi"]
            yr    = int(row["tahun"])
            coord = PROVINSI_COORDS.get(prov)
            combos.append((coord[0], coord[1], yr) if coord else (None, None, yr))
            keys.append((prov, yr))
            if not coord:
                logger.warning(f"  Koordinat tidak ada untuk '{prov}' — pakai default")

        logger.info(f"  Fetch NASA POWER untuk {len(combos)} kombinasi provinsi/tahun...")
        real    = [(lat, lon, yr) for lat, lon, yr in combos if lat is not None]
        fetched = asyncio.run(fetch_all(real)) if real else []

        results = {}
        ri = 0
        for i, (lat, lon, yr) in enumerate(combos):
            prov, yr_ = keys[i]
            results[(prov, yr_)] = fetched[ri] if lat is not None else {**INDONESIA_DEFAULTS, "data_source": "default_fallback"}
            if lat is not None:
                ri += 1

        df = df.copy()
        df["temperature_c"]   = df.apply(lambda r: results.get((r["provinsi"], r["tahun"]), INDONESIA_DEFAULTS)["temperature_c"],   axis=1)
        df["rainfall_mm"]     = df.apply(lambda r: results.get((r["provinsi"], r["tahun"]), INDONESIA_DEFAULTS)["rainfall_mm"],     axis=1)
        df["solar_radiation"] = df.apply(lambda r: results.get((r["provinsi"], r["tahun"]), INDONESIA_DEFAULTS)["solar_radiation"], axis=1)
        df["data_source"]     = df.apply(lambda r: results.get((r["provinsi"], r["tahun"]), INDONESIA_DEFAULTS).get("data_source", "default_fallback"), axis=1)

        n_ok = sum(1 for v in results.values() if v["data_source"] == "nasa_power")
        logger.info(f"  NASA POWER: {n_ok} sukses, {len(results)-n_ok} pakai default")
        return df

    except ImportError:
        logger.warning("  httpx tidak terinstall — pakai nilai iklim default")
        df = df.copy()
        for k, v in INDONESIA_DEFAULTS.items():
            df[k] = v
        df["data_source"] = "default_fallback"
        return df


# ── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Konversi data BPS/Kementan ke format training PanenCerdas",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Komoditas yang didukung: {', '.join(VALID_CROPS)}

Contoh:
  # Format Kementan wide (kolom = tahun)
  python convert_bps_to_training.py --input padi_kementan.csv --crop padi

  # Hortikultura
  python convert_bps_to_training.py --input cabai_besar.csv --crop cabe_besar
  python convert_bps_to_training.py --input bawang_merah.csv --crop bawang_merah

  # Beberapa crop sekaligus — crop ditebak dari nama file
  python convert_bps_to_training.py --input padi_prod.csv jagung_prod.csv kedelai_prod.csv

  # Wide + file luas panen terpisah (yield lebih akurat)
  python convert_bps_to_training.py --input padi_prod.csv --luas padi_luas.csv --crop padi

  # Format long biasa
  python convert_bps_to_training.py --input data_long.csv

  # Cepat tanpa fetch NASA
  python convert_bps_to_training.py --input padi_kementan.csv --crop padi --no-nasa

  # Preview saja
  python convert_bps_to_training.py --input padi_kementan.csv --crop padi --dry-run
        """
    )
    parser.add_argument("--input", "-i", nargs="+", required=True,
                        help="Satu atau lebih file CSV BPS/Kementan")
    parser.add_argument("--crop", "-c", default=None,
                        choices=VALID_CROPS,
                        help="Override crop type (untuk file wide yang tidak ada kolom crop)")
    parser.add_argument("--luas", "-l", default=None,
                        help="File CSV luas panen terpisah (provinsi, tahun, luas_panen_ha)")
    parser.add_argument("--output", "-o", default="data/bps_produksi.csv")
    parser.add_argument("--no-nasa", action="store_true",
                        help="Skip fetch NASA POWER, pakai nilai iklim default")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview saja tanpa simpan file")
    args = parser.parse_args()

    frames = []
    for fpath in args.input:
        if not Path(fpath).exists():
            logger.error(f"File tidak ditemukan: {fpath}")
            sys.exit(1)
        try:
            frames.append(load_and_normalize(fpath, crop_type=args.crop, luas_filepath=args.luas))
        except ValueError as e:
            logger.error(str(e))
            sys.exit(1)

    combined = pd.concat(frames, ignore_index=True)
    logger.info(f"\nTotal gabungan: {len(combined)} baris dari {len(args.input)} file")

    unknown = combined[~combined["crop_type"].isin(VALID_CROPS)]["crop_type"].unique()
    if len(unknown):
        logger.warning(f"Crop tidak dikenal (dibuang): {list(unknown)}")
    combined = combined[combined["crop_type"].isin(VALID_CROPS)]

    combined = enrich_with_static_values(combined)

    if not args.no_nasa:
        logger.info("\nFetching data iklim dari NASA POWER (bisa 2-5 menit)...")
        combined = enrich_with_nasa(combined)
    else:
        for k, v in INDONESIA_DEFAULTS.items():
            combined[k] = v
        combined["data_source"] = "default_fallback"
        logger.info("--no-nasa: pakai nilai iklim default Indonesia")

    OUTPUT_COLS = [
        "ndvi", "rainfall_mm", "temperature_c", "solar_radiation",
        "land_area_ha", "crop_type", "harvest_days", "yield_ton_per_ha",
        "risk_level", "provinsi", "tahun", "data_source", "ndvi_source",
    ]
    for opt in ["produksi_ton", "luas_panen_ha"]:
        if opt in combined.columns:
            OUTPUT_COLS.append(opt)

    final = combined[[c for c in OUTPUT_COLS if c in combined.columns]]

    print("\n" + "="*65)
    print("PREVIEW HASIL (5 baris pertama):")
    print("="*65)
    print(final.head().to_string())
    print(f"\nTotal baris    : {len(final)}")
    print(f"Crop types     : {final['crop_type'].value_counts().to_dict()}")
    print(f"Provinsi unik  : {final['provinsi'].nunique()}")
    print(f"Tahun          : {sorted(final['tahun'].unique())}")
    print(f"Data source    : {final['data_source'].value_counts().to_dict()}")
    print(f"Risk level     : {final['risk_level'].value_counts().to_dict()}")
    print(f"Yield range    : {final['yield_ton_per_ha'].min():.2f} – {final['yield_ton_per_ha'].max():.2f} ton/ha")

    if args.dry_run:
        print("\n[dry-run] File tidak disimpan.")
        return

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final.to_csv(output_path, index=False)
    print(f"\n✅ File tersimpan: {output_path} ({len(final)} baris)")
    print("\nLangkah selanjutnya:\n  python train.py")


if __name__ == "__main__":
    main()