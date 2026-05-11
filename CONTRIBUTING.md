# Cara Kontribusi

## Setup Awal

Anda butuh **dua terminal**: satu untuk backend, satu untuk frontend.

```powershell
# Clone
git clone <repo-url>
cd panen-cerdas

# Terminal 1 - Backend
.\setup-backend.ps1
.\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000

# Terminal 2 - Frontend
.\setup-frontend.ps1
cd frontend
npm run dev
```

Buka:
- Backend Swagger: http://localhost:8000/docs
- Frontend: http://localhost:3000

## Branch Strategy

- `main` - selalu jalan, demo-ready
- `dev` - integration branch, semua merge ke sini dulu
- `feat/<nama>` - feature branch per orang. Contoh: `feat/sentinel-pipeline`, `feat/peta-polish`

```bash
git checkout dev
git pull
git checkout -b feat/your-feature
# kerja
git add .
git commit -m "feat: tambahkan ekstraksi NDVI"
git push origin feat/your-feature
# buka PR ke dev di GitHub
```

## Aturan Tim

1. **Commit pesan jelas** - `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`
2. **Pull dulu sebelum push** - `git pull --rebase origin dev`
3. **Jangan commit data mentah** - `data/raw/` di-gitignore. Share via Google Drive shared folder.
4. **Jangan commit `.env`, `.env.local`** - credential GEE, API keys, dll.
5. **Sync di akhir hari** - semua merge ke `dev`, deploy ke staging (Vercel preview + Railway).
6. **Komunikasi:** kalau stuck > 1 jam, tanya di group chat.

## Pembagian Modul (sesuaikan)

| Orang | Fokus | File utama |
|-------|-------|------------|
| A     | Data + ML | `pipeline/*.py`, `model/*.py`, notebook eksplorasi |
| B     | Backend + integration | `backend/`, bind ML output ke endpoint, deploy backend |
| C     | Frontend + demo | `frontend/`, design polish, deploy Vercel, slide deck |

Bekerja paralel di branch berbeda, integration test di `dev` tiap akhir hari.

## Kontrak API antar Backend dan Frontend

Lihat `backend/schemas.py` (Pydantic) dan `frontend/src/types/index.ts` (TS).
**Keduanya harus sinkron.** Kalau ubah schema Pydantic, ubah juga TS type.

Endpoint yang sudah ada:
- `GET /api/dashboard/summary` - KPI tiles
- `GET /api/dashboard/trend` - line chart produksi historis vs prediksi
- `GET /api/predictions` - list semua kecamatan + status
- `GET /api/predictions/{id}` - drill-down: NDVI series + backtest
- `GET /api/regions/geojson` - polygon kecamatan untuk choropleth

Buka http://localhost:8000/docs untuk Swagger UI interaktif.

## Testing

```bash
# Backend
pytest tests/

# Frontend
cd frontend
npm run type-check
npm run lint
```

Tidak wajib unit test lengkap untuk MVP, tapi minimal smoke test pipeline + type-check pass.

## Deploy

### Backend - Railway (gratis)
1. Push ke GitHub
2. Railway: new project -> deploy from GitHub repo
3. Root directory: `.` (Railway auto-detect `requirements.txt` + start command)
4. Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Env vars: `EE_PROJECT_ID`, `FRONTEND_URL` (URL Vercel)

### Frontend - Vercel (gratis)
1. Vercel: import GitHub repo
2. Root directory: `frontend`
3. Env vars: `NEXT_PUBLIC_API_URL` = URL backend Railway
4. Deploy

### CORS gotcha
Setelah deploy, update `backend/core/config.py` `cors_origins` agar termasuk URL Vercel production.
