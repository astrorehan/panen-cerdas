# Cara Kontribusi

## Setup Awal

Tiga layanan harus jalan paralel: ML service (Python/FastAPI), gateway (Node/Express), dan frontend (Next.js).

```powershell
# Clone
git clone https://github.com/astrorehan/panen-cerdas.git
cd panen-cerdas

# 1. Backend Python + train RandomForest
.\setup-backend.ps1
.\.venv\Scripts\Activate.ps1
cd ml_service
python train.py                    # bikin ml_service/saved_models/*.joblib
cd ..

# 2. Gateway Express
.\setup-express.ps1

# 3. Frontend
.\setup-frontend.ps1
```

Lalu jalankan tiga terminal:

```powershell
# Terminal 1 - ML service
.\.venv\Scripts\Activate.ps1
uvicorn ml_service.main:app --reload --port 8000 --host 127.0.0.1

# Terminal 2 - Express gateway
cd backend-express
node index.js

# Terminal 3 - Frontend
cd frontend
npm run dev
```

Buka:
- Frontend: http://localhost:3000
- Express health: http://localhost:4400/api/health
- ML Swagger: http://localhost:8000/docs

## Branch Strategy

- `main` - selalu jalan, demo-ready
- `feat/<nama>` - feature branch per fitur. Contoh: `feat/real-bps-training`, `feat/gee-ndvi`

```bash
git checkout main
git pull
git checkout -b feat/your-feature
# kerja
git add .
git commit -m "feat: ringkasan singkat"
git push origin feat/your-feature
# buka PR ke main
```

## Aturan Tim

1. **Commit pesan jelas** - `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `chore: ...`.
2. **Pull dulu sebelum push** - `git pull --rebase origin main`.
3. **Jangan commit data mentah** - `data/raw/`, `data/models/`, `data/cache/`, `data/*.jsonl` semua di-gitignore.
4. **Jangan commit `.env`, `.env.local`** - credential GEE, API keys, dll.
5. **ASCII di file `.ps1`** - PowerShell 5.1 di Windows 11 putus parsing pada em-dash atau smart quotes.
6. **Sinkronkan schema** - kalau ubah `ml_service/schemas.py` Pydantic, sinkronkan juga di `frontend/src/types/index.ts`.

## Kontrak API

Lihat:
- `ml_service/schemas.py` (Pydantic, sumber of truth)
- `frontend/src/types/index.ts` (TypeScript mirror)
- Swagger interaktif: http://localhost:8000/docs

Endpoint yang sudah ada (lewat Express `:4400`):

| Method | Path | Sumber |
|--------|------|--------|
| GET | `/api/health` | Express agregasi status ML |
| POST | `/api/predict` | ML service (RandomForest + NASA POWER) |
| POST | `/api/feedback` | ML service (`data/feedback.jsonl`) |
| GET | `/api/dashboard/summary` | ML service dummy (untuk Pemerintah dashboard) |
| GET | `/api/dashboard/trend` | ML service dummy |
| GET | `/api/predictions` | ML service dummy (list kecamatan) |
| GET | `/api/predictions/{id}` | ML service dummy (drill-down) |
| GET | `/api/regions/geojson` | ML service dummy (peta) |

## Testing

```powershell
# Backend smoke test (manual)
curl -X POST http://localhost:4400/api/predict `
  -H "Content-Type: application/json" `
  -d '{\"crop_type\":\"padi\",\"land_area_ha\":1.5,\"pest_pressure\":0.3,\"variety\":\"Ciherang\",\"ndvi\":0.7}'

# Frontend type-check
cd frontend
npm run type-check
npm run lint
```

Unit test belum lengkap untuk MVP. Smoke test manual + type-check pass dianggap cukup.

## Deploy (post-hackathon)

### ML service - Railway / Render
1. Push ke GitHub.
2. Railway / Render: new project -> deploy from GitHub repo.
3. Root: `.`. Start command: `uvicorn ml_service.main:app --host 0.0.0.0 --port $PORT`.
4. Env vars: `EE_PROJECT_ID` (opsional), `FRONTEND_URL` (URL Vercel).

### Express gateway - Railway / Fly.io
1. Root: `backend-express`. Start command: `node index.js`.
2. Env: `PORT`, `ML_SERVICE_URL` (URL Railway ML), `FRONTEND_URL`.

### Frontend - Vercel
1. Root: `frontend`. Env var: `NEXT_PUBLIC_API_URL` = URL Railway/Fly Express gateway.
2. Deploy.

### CORS gotcha
Express CORS origin di-set lewat `FRONTEND_URL` env var. ML service CORS di `ml_service/core/config.py` perlu juga include URL Vercel kalau frontend pernah hit ML langsung (saat ini tidak - semua lewat Express).
