# PanenCerdas

Platform prediksi hasil panen nasional berbasis citra satelit Sentinel-2 + data cuaca BMKG + data historis BPS, untuk prediksi surplus/defisit pangan per kecamatan 3 bulan sebelum panen.

**Status:** Day 1 scaffold. MVP target: 4 hari.

## Scope MVP (4 hari)

- **Wilayah:** 1 provinsi (default: Jawa Barat) — 5-10 kecamatan studi kasus
- **Komoditas:** Padi
- **Periode:** Musim tanam 2023-2024 (ada ground truth BPS untuk validasi)
- **Output:** Web app Streamlit dengan peta choropleth, prediksi per kecamatan, laporan surplus/defisit

## Stack

- **UI:** Streamlit + streamlit-option-menu + streamlit-folium
- **ML:** XGBoost / LightGBM (tabular features)
- **Pipeline data:** Google Earth Engine (Sentinel-2), ERA5/BMKG (cuaca), BPS (yield historis)
- **Geospatial:** geopandas, folium (raster I/O via GEE, server-side)
- **Charts:** Plotly

## Quick Start

> **PENTING:** Wajib pakai **Python 3.12** (bukan 3.13/3.14). ML & geospatial packages belum punya Windows wheels untuk 3.13+. Download: https://www.python.org/downloads/release/python-3128/
>
> Saat install Python 3.12, **tick "Add Python to PATH"** dan **"py launcher"**.

### Cara mudah (Windows PowerShell)

```powershell
.\setup.ps1
```

Script ini otomatis: cek Python 3.12, hapus venv lama, buat venv baru, install deps.

### Cara manual

```powershell
# 1. Buat venv dengan Python 3.12 (BUKAN default python)
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1

# 2. Upgrade pip dulu (penting!)
python -m pip install --upgrade pip wheel setuptools

# 3. Install deps
pip install -r requirements.txt

# 4. Setup Earth Engine (sekali saja)
earthengine authenticate

# 5. Copy env file
copy .env.example .env

# 6. Run app
streamlit run app.py
```

App akan terbuka di http://localhost:8501

## Struktur Project

```
panen-cerdas/
├── app.py                    # Streamlit entry point
├── pages/                    # Multi-page sections
│   ├── 1_Dashboard.py        # Overview + KPI
│   ├── 2_Peta_Prediksi.py    # Choropleth map
│   ├── 3_Detail_Kecamatan.py # Drill-down per kecamatan
│   └── 4_Tentang.py          # Tentang project
├── pipeline/                 # Data extraction & processing
│   ├── sentinel.py           # GEE Sentinel-2 NDVI
│   ├── weather.py            # BMKG / ERA5 cuaca
│   ├── bps.py                # BPS yield historis
│   └── features.py           # Feature engineering
├── model/                    # ML training & prediction
│   ├── train.py
│   ├── predict.py
│   └── evaluate.py
├── utils/                    # Shared helpers
│   ├── geo.py                # Geospatial utils
│   └── viz.py                # Visualization helpers
├── data/
│   ├── raw/                  # Raw downloads (git-ignored)
│   ├── processed/            # Cleaned CSV/parquet
│   ├── models/               # Trained model artifacts
│   └── shapefiles/           # Batas kecamatan
├── notebooks/                # Eksplorasi data
└── tests/
```

## Pembagian Tugas (saran 3 orang)

Lihat [ROADMAP.md](./ROADMAP.md) untuk detail per hari.

- **Person A — Data Engineer:** `pipeline/` (sentinel, weather, bps), shapefile kecamatan
- **Person B — ML Engineer:** `model/`, feature engineering, evaluation
- **Person C — Frontend/Demo:** `app.py`, `pages/`, theming, peta, pitch deck

Bekerja paralel di branch berbeda, merge ke `dev` tiap akhir hari.

## Cara Kontribusi

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md).
