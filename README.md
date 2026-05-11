# PanenCerdas

Platform prediksi hasil panen nasional berbasis citra satelit Sentinel-2 + data cuaca BMKG + data historis BPS, untuk prediksi surplus/defisit pangan per kecamatan 3 bulan sebelum panen.

**UNITY Competition #14 UNY 2026 - Software Development**

**Status:** Day 1 scaffold (pivoted to Next.js + FastAPI). MVP target: 4 hari.

## Scope MVP (4 hari)

- **Wilayah:** 1 provinsi (default: Jawa Barat) - 5-10 kecamatan studi kasus
- **Komoditas:** Padi
- **Periode:** Musim tanam 2023-2024 (ada ground truth BPS untuk validasi)
- **Output:** Web app dengan peta choropleth, drill-down per kecamatan, surplus/defisit logic

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 + TypeScript + Tailwind + shadcn/ui + react-leaflet + recharts |
| Backend | FastAPI (Python 3.12) + Pydantic |
| ML | XGBoost / scikit-learn (tabular) |
| Pipeline data | Google Earth Engine (Sentinel-2) + ERA5/BMKG + BPS Excel |
| Geospatial | geopandas + shapely (raster I/O via GEE server-side) |
| Hosting (target) | Vercel (frontend) + Railway (backend) |

## Quick Start

> **PENTING:** Wajib Python 3.12 (bukan 3.13/3.14) dan Node.js 20+ LTS.
>
> - Python: https://www.python.org/downloads/release/python-3128/ (tick "Add to PATH")
> - Node: https://nodejs.org/ (LTS)

### Cara mudah (Windows PowerShell)

```powershell
# Terminal 1 - backend
.\setup-backend.ps1
.\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000

# Terminal 2 - frontend
.\setup-frontend.ps1
cd frontend
npm run dev
```

- Backend: http://localhost:8000/docs (Swagger UI)
- Frontend: http://localhost:3000

### Cara manual

Backend:
```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip wheel setuptools
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Frontend:
```powershell
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

## Struktur Project

```
panen-cerdas/
├── backend/                  # FastAPI server
│   ├── main.py
│   ├── api/
│   │   ├── dashboard.py      # GET /api/dashboard/*
│   │   ├── predictions.py    # GET /api/predictions, /api/predictions/{id}
│   │   └── regions.py        # GET /api/regions/geojson
│   ├── schemas.py            # Pydantic models
│   └── core/config.py
├── frontend/                 # Next.js app
│   └── src/
│       ├── app/              # Routes: /, /peta, /detail, /tentang
│       ├── components/       # Navbar, KPI card, charts, map
│       ├── lib/api.ts        # Backend client
│       └── types/            # Shared types
├── pipeline/                 # Data ingestion (NotImplementedError, Day 2)
│   ├── sentinel.py           # GEE Sentinel-2 NDVI
│   ├── weather.py            # ERA5 / BMKG
│   ├── bps.py                # BPS Excel parser
│   └── features.py           # Join + lag features
├── model/                    # ML
│   ├── train.py              # XGBoost
│   ├── predict.py            # Yield + surplus/defisit
│   └── evaluate.py           # MAPE / RMSE
├── utils/                    # geo helpers, status classifier
├── data/                     # raw, processed, models, shapefiles (gitignored)
├── tests/
├── requirements.txt
├── setup-backend.ps1
├── setup-frontend.ps1
├── ROADMAP.md                # 4-day plan with risks
└── CONTRIBUTING.md           # Branch strategy + role split
```

## Pembagian Tugas (saran 3 orang)

| Orang | Fokus | Folder utama |
|-------|-------|--------------|
| A     | Data pipeline + ML | `pipeline/`, `model/` |
| B     | Backend API + integration | `backend/`, glue ML <-> API |
| C     | Frontend + demo | `frontend/`, pitch deck |

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md) untuk workflow.

## Kontribusi

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md).

## Roadmap

Lihat [ROADMAP.md](./ROADMAP.md).
