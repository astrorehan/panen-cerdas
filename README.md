# PanenCerdas

Platform prediksi panen dua-peran (petani + pemerintah) berbasis citra satelit Sentinel-2, data cuaca NASA POWER, data historis BPS, dan model RandomForest (scikit-learn). Petani mengisi formulir prediksi per-lahan dan menerima rekomendasi tindakan; pemerintah memantau status pangan kecamatan dan lembar peringatan defisit.

**UNITY Competition #14 UNY 2026 - Software Development**

**Status:** MVP feature-complete (Phase 0-7). NASA POWER live, RandomForest dilatih dari kombinasi data BPS + sintetik (training pipeline final dengan label BPS asli adalah next phase).

## Arsitektur

Tiga layanan, dijalankan terpisah di lokal:

```
Browser  ->  Next.js 14 (frontend, :3000)
              |
              v
            Express gateway (:4400)         <- proxy + fallback layer
              |
              v
            FastAPI ml_service (:8000)      <- ML, NASA POWER, dummy dashboard
```

| Layer | Tech | Folder |
|-------|------|--------|
| Frontend | Next.js 14 + TypeScript + Tailwind + react-leaflet + recharts | `frontend/` |
| Gateway | Node 20 + Express 4 + axios | `backend-express/` |
| ML service | FastAPI + Pydantic + scikit-learn (RandomForest) + NASA POWER | `ml_service/` |
| Training | scikit-learn (RandomForestRegressor + RandomForestClassifier) | `ml_service/train.py` |

## Quick Start

> **PENTING:** Python 3.12 (bukan 3.13/3.14) dan Node.js 20+ LTS.
>
> - Python: https://www.python.org/downloads/release/python-3128/ (tick "Add to PATH")
> - Node: https://nodejs.org/ (LTS)

### Setup pertama kali

```powershell
# Backend Python (FastAPI + scikit-learn RandomForest)
.\setup-backend.ps1

# Train RandomForest (~5 detik, hasilkan tiga .joblib di ml_service/saved_models/)
.\.venv\Scripts\Activate.ps1
cd ml_service
python train.py
cd ..

# Gateway Express
.\setup-express.ps1

# Frontend Next.js
.\setup-frontend.ps1
```

### Menjalankan (3 terminal)

```powershell
# Terminal 1 - ML service (FastAPI on :8000)
.\.venv\Scripts\Activate.ps1
uvicorn ml_service.main:app --reload --port 8000 --host 127.0.0.1

# Terminal 2 - Express gateway (:4400)
cd backend-express
node index.js

# Terminal 3 - Frontend (:3000)
cd frontend
npm run dev
```

Buka **http://localhost:3000** -> akan diarahkan ke `/login` untuk memilih peran.

> Catatan port: Express memakai `:4400` karena Windows 11 sering memasukkan port range `3945-4044` ke excluded list. Cek dengan `netsh interface ipv4 show excludedportrange protocol=tcp`.

## Rute Aplikasi

| Peran | Rute | Fungsi |
|-------|------|--------|
| - | `/login` | Pilih peran (Petani / Pemerintah), simpan ke localStorage |
| - | `/` | Router yang me-redirect berdasarkan peran |
| Petani | `/petani/dashboard` | Beranda dengan pintasan |
| Petani | `/petani/prediksi` | **CORE** - formulir prediksi panen per-lahan |
| Petani | `/petani/lahan` | Daftar lahan terdaftar (mock data) |
| Petani | `/petani/harga` | Harga komoditas mingguan |
| Petani | `/petani/cuaca` | Prakiraan 7 hari |
| Pemerintah | `/pemerintah/dashboard` | KPI strip + tren produksi historis |
| Pemerintah | `/pemerintah/produksi` | Choropleth status pangan per kecamatan |
| Pemerintah | `/pemerintah/analisis` | Deep-dive per kecamatan (NDVI + backtest) |
| Pemerintah | `/pemerintah/alert` | Daftar kecamatan defisit/waspada, terurut |

## API

Express gateway pada `:4400` membungkus semua endpoint:

| Method | Path | Tujuan |
|--------|------|--------|
| GET | `/api/health` | Status kedua layer |
| POST | `/api/predict` | Prediksi panen (forward ke ml_service `/predict`). Fallback shape kalau ML down. |
| POST | `/api/feedback` | Catat realisasi panen aktual untuk retraining (`data/feedback.jsonl`). |
| GET | `/api/dashboard/summary` | KPI pemerintah (proxy ke FastAPI) |
| GET | `/api/dashboard/trend` | Tren produksi historis |
| GET | `/api/predictions` | List prediksi kecamatan |
| GET | `/api/predictions/{id}` | Detail kecamatan (NDVI + backtest) |
| GET | `/api/regions/geojson` | Polygon kecamatan untuk peta |

Swagger ML service: http://localhost:8000/docs

## Otentikasi

Tidak ada JWT/DB pada MVP — peran disimpan di `localStorage` browser (`panen.role` = `"petani"` atau `"pemerintah"`). `AuthGuard` di setiap layout role memaksa redirect ke `/login` kalau peran tidak cocok. Logout = `clearRole()`.

## Catatan Model (Phase 7)

- Tiga model RandomForest scikit-learn disimpan di `ml_service/saved_models/`:
  - `harvest_days_model.joblib` — `RandomForestRegressor` untuk estimasi hari panen.
  - `yield_model.joblib` — `RandomForestRegressor` untuk yield (ton/ha) — dilatih pada `yield_ratio` (yield / baseline per komoditas) supaya tidak didominasi satu crop.
  - `risk_model.joblib` — `RandomForestClassifier` (low / medium / high) dengan `class_weight="balanced"`.
- Sumber data training: CSV BPS produksi nasional 2021-2025 + cache NASA POWER + feedback realisasi petani (lewat DB), dilengkapi generator sintetik klimatologis untuk total ~2.000 baris.
- Pipeline training final dengan label BPS + fitur Sentinel-2/ERA5 penuh belum diimplementasikan (next phase post-hackathon).
- NASA POWER (`PRECTOTCORR`, `T2M`, `ALLSKY_SFC_SW_DWN`) di-fetch live untuk request GPS mode dengan 24h disk cache di `data/cache/power/`. Fallback ke nilai default tropis kalau jaringan gagal.
- GEE Sentinel-2 NDVI **sengaja ditangguhkan** (auth + kuota terlalu berat untuk window hackathon). `ndvi_source="estimated"` masih kembalikan 0.65 hardcoded.

## Struktur Project

```
panen-cerdas/
├── ml_service/                # FastAPI ML service (port 8000)
│   ├── main.py
│   ├── api/
│   │   ├── ml.py              # POST /predict + POST /feedback
│   │   ├── dashboard.py       # GET /api/dashboard/*
│   │   ├── predictions.py     # GET /api/predictions, /api/predictions/{id}
│   │   └── regions.py         # GET /api/regions/geojson
│   ├── climate.py             # NASA POWER fetcher + disk cache
│   ├── model.py               # RandomForest training + inference (3 model: harvest/yield/risk)
│   ├── train.py               # CLI entry point untuk re-train
│   ├── saved_models/          # *.joblib artifacts (gitignored)
│   ├── schemas.py             # Pydantic models (PredictRequest/Response, dst)
│   └── core/config.py
├── backend-express/           # Node Express gateway (port 4400)
│   ├── index.js
│   ├── routes/
│   │   ├── predict.js         # /api/predict + ML-down fallback
│   │   ├── feedback.js        # /api/feedback (503 kalau ML down)
│   │   ├── health.js          # /api/health (status kedua layer)
│   │   └── passthrough.js     # forward /api/dashboard/*, /api/predictions/*, /api/regions/* ke FastAPI
│   ├── package.json
│   └── .env (PORT=4400, ML_SERVICE_URL=http://localhost:8000)
├── frontend/                  # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── login/
│       │   ├── page.tsx       # role router
│       │   ├── petani/{dashboard,prediksi,lahan,harga,cuaca}/
│       │   └── pemerintah/{dashboard,produksi,analisis,alert}/
│       ├── components/        # AuthGuard, ResultCard, FeedbackForm, navbar, dst
│       ├── lib/
│       │   ├── api.ts         # api.dashboard.*, api.predictions.*, api.ml.predict/feedback
│       │   └── auth.ts        # localStorage role
│       └── types/
├── data/
│   ├── cache/power/           # NASA POWER 24h cache (gitignored)
│   ├── predictions.jsonl      # request log (gitignored)
│   ├── feedback.jsonl         # realisasi panen petani (gitignored)
│   ├── raw/                   # data mentah BPS/GEE (gitignored)
│   └── shapefiles/            # GADM polygon (gitignored)
├── requirements.txt
├── setup-backend.ps1          # bikin venv + install Python deps
├── setup-express.ps1          # npm install gateway
├── setup-frontend.ps1         # npm install frontend
├── ROADMAP.md
└── CONTRIBUTING.md
```

## Kontribusi

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md).

## Roadmap

Lihat [ROADMAP.md](./ROADMAP.md).
