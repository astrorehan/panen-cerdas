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
- **Geospatial:** geopandas, folium, rasterio
- **Charts:** Plotly

## Quick Start

```bash
# 1. Buat virtual env
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux

# 2. Install deps
pip install -r requirements.txt

# 3. Setup Earth Engine (sekali saja)
earthengine authenticate

# 4. Copy env file dan isi credentials
cp .env.example .env

# 5. Run app
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
