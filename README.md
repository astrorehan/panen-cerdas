# PanenCerdas

Platform prediksi panen dua-peran (petani + pemerintah) berbasis NDVI satelit MODIS, data cuaca NASA POWER, data historis Kementan produksi, dan tiga model RandomForest (scikit-learn). Petani mengisi formulir prediksi per-lahan dan menerima rekomendasi tindakan; pemerintah memantau status pangan kecamatan/provinsi dan lembar peringatan defisit.

**UNITY Competition #14 UNY 2026 — Software Development**

**Status:** MVP feature-complete. NDVI real dari NASA APPEEARS (MODIS MOD13Q1), cuaca live NASA POWER, 9 komoditas terlatih (padi, jagung, kedelai, ubi_jalar, ubi_kayu, cabe_besar, cabe_rawit, bawang_merah, bawang_putih), pilot DIY per-kecamatan + 37 provinsi nasional, online retraining tiap 10 feedback. Autentikasi + database via Supabase (email + password + role, Postgres `prediction_log` / `training_feedback` / `model_version` / `climate_cache`).

## Arsitektur

Tiga layanan + Supabase auth (BaaS), dijalankan terpisah di lokal:

```
Browser  ->  Next.js 14 (frontend, :3000)  ----> Supabase (auth + profiles)
              |
              v
            Express gateway (:4200)         <- proxy + fallback layer
              |
              v
            FastAPI ml_service (:8000)      <- ML, NASA POWER, APPEEARS NDVI
              |
              v
            Supabase Postgres (cloud)       <- prediction_log, training_feedback,
                                               model_version, climate_cache
```

| Layer | Tech | Folder |
|-------|------|--------|
| Frontend | Next.js 14 + TypeScript + Tailwind + react-leaflet + recharts + @supabase/supabase-js | `frontend/` |
| Auth | Supabase (email/password + `profiles` table dengan role check) | (BaaS) |
| Gateway | Node 20 + Express 4 + axios | `backend-express/` |
| ML service | FastAPI + Pydantic + scikit-learn + SQLAlchemy (Supabase Postgres, SQLite fallback) | `ml_service/` |
| Data sources | NASA POWER (cuaca), NASA APPEEARS MOD13Q1 (NDVI 250m/16-hari), Kementan 2020-2025 | `ml_service/data/` |
| Training | 3 model RandomForest (harvest_days, yield_ratio, risk) + online retrain | `ml_service/model.py`, `ml_service/retrain_scheduler.py` |

## Quick Start

> **PENTING:** Python 3.12 (bukan 3.13/3.14, wheel-nya belum lengkap di Windows) dan Node.js 20+ LTS.
>
> - Python: https://www.python.org/downloads/release/python-3128/ (tick "Add to PATH")
> - Node: https://nodejs.org/ (LTS)

### Setup pertama kali

```powershell
# Backend Python (FastAPI + scikit-learn)
.\setup-backend.ps1

# Train RandomForest (~5-10 detik, hasilkan artifacts di ml_service/saved_models/)
.\.venv\Scripts\Activate.ps1
cd ml_service
python train.py
cd ..

# Gateway Express
.\setup-express.ps1

# Frontend Next.js
.\setup-frontend.ps1
```

### Konfigurasi env

**`ml_service/.env`** — kredensial Supabase Postgres (untuk shared DB antar device) + APPEEARS untuk NDVI real (daftar gratis di https://appeears.earthdatacloud.nasa.gov/). Tanpa APPEEARS, NDVI fallback ke estimasi musiman.

```
DATABASE_URL=postgresql://postgres:PASSWORD@db.YOUR-PROJECT-REF.supabase.co:5432/postgres
HOST=0.0.0.0
PORT=8000
RETRAIN_FEEDBACK_THRESHOLD=10
APPEEARS_USER=your_user
APPEEARS_PASS=your_pass
```

Cara dapetin `DATABASE_URL` + init tabel: lihat [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) §6.

**`frontend/.env.local`** — kredensial Supabase. Lihat [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) untuk langkah lengkap (bikin project, disable email confirm, bikin tabel `profiles`).

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Menjalankan (3 terminal)

```powershell
# Terminal 1 - ML service (FastAPI on :8000)
.\.venv\Scripts\Activate.ps1
.\ml_service\run.ps1
# atau: uvicorn ml_service.main:app --reload --port 8000 --host 127.0.0.1

# Terminal 2 - Express gateway (:4200)
.\backend-express\run.ps1
# atau: cd backend-express; node index.js

# Terminal 3 - Frontend (:3000)
cd frontend
npm run dev
```

Buka **http://localhost:3000** — akan diarahkan ke `/login` (atau `/register` untuk akun baru).

> Catatan port: Express memakai `:4200` karena Windows 11 sering memasukkan port range `3945-4044` ke excluded list. Cek dengan `netsh interface ipv4 show excludedportrange protocol=tcp`.

## Rute Aplikasi

| Peran | Rute | Fungsi |
|-------|------|--------|
| Publik | `/login` | Login Supabase (email + password), redirect sesuai role |
| Publik | `/register` | Daftar akun baru + pilih role (petani / pemerintah) |
| Publik | `/tentang` | Halaman tentang produk |
| Publik | `/hubungi-kami` | Halaman kontak |
| - | `/` | Router yang me-redirect berdasarkan role tersimpan |
| Petani | `/petani/dashboard` | Beranda dengan pintasan |
| Petani | `/petani/prediksi` | **CORE** — formulir prediksi panen per-lahan (9 komoditas + hama + varietas) |
| Petani | `/petani/lahan` | Daftar lahan petani (derive dari `prediction_log`) |
| Petani | `/petani/cuaca` | Prakiraan 7 hari (NASA POWER live) |
| Pemerintah | `/pemerintah/dashboard` | KPI strip + tren produksi historis (real Kementan + DB) |
| Pemerintah | `/pemerintah/produksi` | Choropleth status pangan per kecamatan/provinsi |
| Pemerintah | `/pemerintah/analisis` | Deep-dive per kecamatan (NDVI series + backtest) |
| Pemerintah | `/pemerintah/alert` | Daftar kecamatan defisit/waspada, terurut |

## API

Express gateway pada `:4200` membungkus semua endpoint:

| Method | Path | Tujuan |
|--------|------|--------|
| GET | `/api/health` | Status kedua layer |
| POST | `/api/predict` | Prediksi panen (forward ke ml_service). Fallback shape kalau ML down. |
| POST | `/api/feedback` | Catat realisasi panen aktual untuk online retraining (503 kalau ML down) |
| GET | `/api/feedback/stats` | Statistik feedback terkumpul + threshold retrain |
| GET | `/api/feedback/history` | Riwayat feedback per petani |
| GET | `/api/dashboard/summary` | KPI pemerintah (real Kementan + DB) |
| GET | `/api/dashboard/trend` | Tren produksi historis |
| GET | `/api/predictions` | List prediksi (multi-provinsi) |
| GET | `/api/predictions/:id` | Detail kecamatan (NDVI series + backtest) |
| GET | `/api/predictions/history` | Riwayat prediksi per petani |
| GET | `/api/lahan` | Daftar lahan petani (derive dari `prediction_log`) |
| GET | `/api/regions/geojson` | Polygon kecamatan / provinsi untuk peta |
| GET | `/api/regions/provinces` | Lookup 37 provinsi (kode Kementan + centroid + alias) |

Swagger ML service: http://localhost:8000/docs

## Otentikasi

Auth via **Supabase**: signup/signin email + password client-side dengan `@supabase/supabase-js`, lalu profil (role, name) disimpan di tabel `public.profiles` dengan Row-Level Security. Setelah signin sukses, `frontend/src/lib/auth.ts` cache `user_id` + `role` + `name` di `localStorage` (`panen.user_id`, `panen.role`, `panen.user_name`) supaya `AuthGuard` di layout role bisa redirect tanpa round-trip per page.

Tidak ada perubahan di Express atau ml_service — auth murni client-side. Backend tidak verifikasi JWT (cukup untuk MVP/hackathon; production butuh `supabase.auth.getUser(token)` di middleware Express).

Setup detail (bikin project, disable email confirm, SQL `profiles` + RLS): [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Catatan Model (v2.5)

- Tiga model RandomForest scikit-learn disimpan di `ml_service/saved_models/`:
  - `harvest_days_model.joblib` — `RandomForestRegressor` untuk estimasi hari panen.
  - `yield_model.joblib` — `RandomForestRegressor` dengan target `yield_ratio` (yield / baseline per komoditas) supaya tidak didominasi satu crop.
  - `risk_model.joblib` — `RandomForestClassifier` (low / medium / high) dengan `class_weight="balanced"`.
  - Plus `crop_encoder.joblib`, `crop_group_encoder.joblib`, `feature_meta.joblib`.
- **9 komoditas**: padi, jagung, kedelai, ubi_jalar, ubi_kayu, cabe_besar, cabe_rawit, bawang_merah, bawang_putih.
- Fitur **hama** + **varietas** sudah masuk schema dan training pipeline.
- Sumber data training: CSV Kementan produksi 2020-2025 (`ml_service/data/kementan_produksi.csv`, 9 komoditas × 37 provinsi) + cache NASA POWER + cache APPEEARS NDVI + feedback realisasi petani dari `panencerdas_ml.db`, dilengkapi generator sintetik klimatologis bila baris kurang.
- **NDVI real**: NASA APPEEARS MOD13Q1 (MODIS, 16-hari, 250m). Single point + time-series, di-cache di SQLite (`data_cache.py`). Fallback ke estimasi musiman bila APPEEARS gagal/tidak terkonfigurasi.
- NASA POWER (`PRECTOTCORR`, `T2M`, `ALLSKY_SFC_SW_DWN`) di-fetch live untuk request GPS mode, di-cache 24h.
- **Online retraining**: scheduler di `retrain_scheduler.py` retrain otomatis tiap `RETRAIN_FEEDBACK_THRESHOLD` feedback baru (default 10) + cron mingguan (Minggu 02.00).

## Struktur Project

```
panen-cerdas/
├── ml_service/                       # FastAPI ML service (port 8000)
│   ├── main.py                       # entry point, register semua router
│   ├── model.py                      # training & inference (3 model RF, 9 komoditas)
│   ├── train.py                      # CLI training script
│   ├── schemas.py                    # Pydantic input/output
│   ├── fallback_rules.py             # rule-based fallback (saat model belum ada)
│   ├── data_fetcher.py               # NASA POWER fetcher
│   ├── ndvi_fetcher.py               # NASA APPEEARS MOD13Q1 (single + time-series)
│   ├── data_cache.py                 # cache POWER + APPEEARS (table climate_cache)
│   ├── database.py                   # SQLAlchemy ORM + CRUD (Supabase Postgres)
│   ├── kementan_data.py              # reader Kementan produksi 2020-2025
│   ├── provinces_data.py             # lookup 37 provinsi (kode Kementan + centroid + alias)
│   ├── feedback_router.py            # /api/feedback{,/stats,/history}
│   ├── predictions_router.py         # /api/predictions{,/{id},/history}
│   ├── dashboard_router.py           # /api/dashboard/{summary,trend}
│   ├── regions_router.py             # /api/regions/{geojson,provinces}
│   ├── lahan_router.py               # /api/lahan
│   ├── retrain_scheduler.py          # auto-retrain tiap N feedback / Minggu 02.00
│   ├── scripts/                      # fetch_historical, prewarm_ndvi_cache, test_appeears_login
│   ├── data/                         # kementan_produksi.csv, nasa_power_cache.csv, yogyakarta_kecamatan.geojson
│   ├── Data_Raw/                     # CSV mentah Kementan per komoditas
│   ├── saved_models/                 # *.joblib artifacts (committed dari PanenPintar-V2)
│   ├── .env                          # APPEEARS creds + Supabase DATABASE_URL (gitignored)
│   └── README.md
├── backend-express/                  # Node Express gateway (port 4200)
│   ├── index.js
│   ├── routes/{predict,feedback,health,passthrough}.js
│   └── .env (PORT=4200, ML_SERVICE_URL=http://localhost:8000)
├── frontend/                         # Next.js 14 App Router
│   └── src/
│       ├── app/
│       │   ├── login/                # Supabase signin
│       │   ├── register/             # Supabase signup + role picker
│       │   ├── tentang/              # halaman tentang
│       │   ├── hubungi-kami/         # halaman kontak
│       │   ├── page.tsx              # role router
│       │   ├── petani/{dashboard,prediksi,lahan,cuaca}/
│       │   └── pemerintah/{dashboard,produksi,analisis,alert}/
│       ├── components/               # AuthGuard, ResultCard, FeedbackForm, navbar, choropleth-map
│       ├── lib/
│       │   ├── supabase.ts           # supabase client
│       │   ├── auth.ts               # signIn/signUp/signOut + session cache
│       │   └── api.ts                # api.dashboard.*, api.predictions.*, api.ml.predict/feedback
│       └── types/
├── SUPABASE_SETUP.md                 # langkah setup Supabase project + tabel profiles
├── requirements.txt
├── setup-backend.ps1                 # bikin venv + install Python deps
├── setup-express.ps1                 # npm install gateway + bikin .env
├── setup-frontend.ps1                # npm install frontend + bikin .env.local
├── ROADMAP.md
└── CONTRIBUTING.md
```

## Deploy

Status saat ini: **dev/demo-ready, belum 100% deploy-ready**. Lihat checklist di bawah.

### Target hosting (rekomendasi gratis-tier)

| Service | Platform | Catatan |
|---|---|---|
| Frontend | Vercel | Auto-detect Next.js, tambah env vars di dashboard |
| Express gateway | Render / Railway / Fly | Web Service, root: `backend-express/`, build: `npm install`, start: `node index.js` |
| ml_service | Render / Railway / Fly | Web Service, root: `ml_service/`, runtime Python 3.12, build: `pip install -r requirements.txt`, start: `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Postgres | Supabase | Sudah aktif (project `mhjxabdsfeaafawnoeyn`) |

### Env vars per service (saat deploy)

**Vercel (frontend):**
```
NEXT_PUBLIC_SUPABASE_URL=https://mhjxabdsfeaafawnoeyn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dari Supabase Dashboard>
NEXT_PUBLIC_API_URL=https://<express-prod-url>
```

**Express:**
```
ML_SERVICE_URL=https://<ml-service-prod-url>
FRONTEND_URL=https://<frontend-prod-url>
ML_TIMEOUT_MS=60000
# PORT — biarkan PaaS yang assign
```

**ml_service:**
```
DATABASE_URL=postgresql://postgres.mhjxabdsfeaafawnoeyn:<pwd>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
APPEEARS_USER=<creds>
APPEEARS_PASS=<creds>
RETRAIN_FEEDBACK_THRESHOLD=10
```

### Checklist sebelum deploy

- [x] **Tabel Postgres** sudah live di Supabase (apply via MCP / SUPABASE_SETUP.md §6).
- [x] **Trained models** (`saved_models/*.joblib`) di-commit, jadi tidak perlu re-train saat deploy.
- [x] **`ml_service/main.py`** — `_fill_climate_defaults` jalan kalau iklim None, jadi tahan input minim.
- [x] **`backend-express/index.js`** — sudah `Number(process.env.PORT) || 4000`, kompatibel PaaS.
- [ ] **`ml_service/.env`** — `DATABASE_URL` harus diisi password asli (saat ini masih `[YOUR-PASSWORD]`). Untuk deploy: set di env var hosting, jangan commit.
- [ ] **`ml_service/main.py` line 377** — `uvicorn.run(..., port=8000, reload=True)`. Untuk prod, jangan dipakai (start lewat CLI: `uvicorn main:app --port $PORT`). Hapus `reload=True` di prod.
- [ ] **CORS** — `ml_service/main.py:85` masih `allow_origins=["*"]`. Ganti ke `[FRONTEND_URL, EXPRESS_URL]` sebelum publish.
- [ ] **Runtime pin** — tambah `runtime.txt` (`python-3.12.8`) di `ml_service/` supaya Render/Railway pakai Python 3.12.
- [ ] **`backend-express/.env`** vs prod env — `PORT=4400` di `.env` akan override `process.env.PORT`. Hapus baris `PORT=` di production env vars.
- [ ] **Supabase URL `frontend/.env.local`** masih anon key legacy. Boleh tetap (still works) atau pindah ke `sb_publishable_*` key baru.
- [ ] **Leaked password protection** — `Supabase Dashboard → Auth → Password security` toggle ON (advisor WARN).
- [ ] **APPEEARS rate limit** — 1 task/min/user di tier gratis. Kalau prod traffic banyak, prewarm cache (`scripts/prewarm_ndvi_cache.py`) atau register user APPEEARS kedua.

### Risiko yang masih ada

1. **Cold start ml_service** — load 6 joblib models + connect Postgres pool butuh 5-15 detik. Render free tier sleep setelah 15 menit idle → request pertama akan delay. Mitigasi: paid tier atau cron ping tiap 10 menit.
2. **Supabase pool limit** — free tier session pooler ≈ 60 koneksi. SQLAlchemy default pool 5 + overflow 10, masih aman untuk demo. Pantau kalau scale.
3. **NDVI fetcher async** — `ndvi_fetcher.py` polling APPEEARS task selama beberapa menit. Kalau request timeout (Express `ML_TIMEOUT_MS=60000`), fallback ke estimasi musiman. Acceptable untuk demo.

## Kontribusi

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md).

## Roadmap

Lihat [ROADMAP.md](./ROADMAP.md).
