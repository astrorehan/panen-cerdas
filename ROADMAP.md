# Roadmap PanenCerdas

> **Status (2026-05-12, Day 3 of 4):** Phase 0-7 SELESAI. MVP feature-complete, NASA POWER live, RandomForest dilatih dari kombinasi Kementan + sintetik. Sisa: dokumentasi + demo deck + deploy.

## Selesai

### Phase 0 - Repo restructure
- `backend/` -> `ml_service/` agar nama "backend" bebas dipakai layer gateway baru.
- Semua import + uvicorn command + setup script disesuaikan.

### Phase 1 - ML endpoints
- `POST /predict` dan `POST /feedback` di `ml_service/api/ml.py`.
- Kontrak Pydantic lengkap: crop_type, land_area_ha, pest_pressure, variety, lat/lon, rainfall_mm, temperature_c, solar_radiation, ndvi.
- Logging ke `data/predictions.jsonl` + `data/feedback.jsonl`.

### Phase 2 - Express gateway
- Node + Express pada `127.0.0.1:4200`.
- Routes typed: `/api/predict` (dengan fallback), `/api/feedback`, `/api/health`.
- Passthrough: `/api/dashboard/*`, `/api/predictions/*`, `/api/regions/*` ke FastAPI.

### Phase 3 - Role auth + login
- `lib/auth.ts` localStorage-based (`panen.role`).
- `/login` dua tombol kartu (Petani / Pemerintah).
- `AuthGuard` per layout role, `SkeletonLoader` saat pengecekan.
- Navbar role-aware, tombol Keluar.

### Phase 4 - /petani/prediksi (CORE)
- Form lengkap: crop picker, luas, varietas cascading, pest pressure 0/0.3/0.6/0.9, climate mode toggle (Default/GPS/Manual), NDVI override.
- `ResultCard` dengan badge risiko, recommendations, provenance chip, confidence %.
- `FeedbackForm` di bawah hasil untuk realisasi panen.

### Phase 5 - Reorganisasi pemerintah
- `/` -> role router murni.
- Editorial dashboard pindah ke `/pemerintah/dashboard`, peta ke `/pemerintah/produksi`, detail ke `/pemerintah/analisis`.
- Semua di bawah `AuthGuard requiredRole="pemerintah"`.

### Phase 6 - Petani secondary + Alert
- `/petani/dashboard` real (quick links).
- `/petani/lahan`, `/petani/harga`, `/petani/cuaca` dengan mock data.
- `/pemerintah/alert` baca `/api/predictions`, filter status waspada/defisit, urutkan ascending surplus_pct.

### Phase 7 - NASA POWER + RandomForest
- `ml_service/climate.py` - NASA POWER live fetch (30-day rolling), 24h disk cache.
- `ml_service/model.py` - load `.joblib` saat import, fallback ke `fallback_rules.py` kalau tidak ada.
- `ml_service/train.py` - load Kementan + NASA cache + sintetik klimatologis (~2.000 baris), train tiga RandomForest (harvest_days, yield, risk), save `.joblib` ke `saved_models/`.
- `ml_service/predictions_router.py` - pakai model + climate kalau tersedia, fallback rules sebagai cadangan.

## Tersisa (post-hackathon)

### A. Demo + submission (P0, hari deadline)
- [ ] Slide deck: problem -> solusi -> arsitektur -> demo -> impact -> roadmap.
- [ ] Demo video 2 menit (Loom / OBS).
- [ ] Public URL: deploy frontend ke Vercel + ML ke Railway + Express ke Railway/Fly.
- [ ] Buffer 6 jam: cold start, CORS production, dll.

### B. Polishing (P1)
- [ ] Seed `data/predictions.jsonl` dengan ~10 entry biar `prediction_log_id` start tidak dari 1.
- [ ] Halaman `/tentang` di-update untuk arsitektur baru.
- [ ] Pytest dasar untuk `/predict` happy path.
- [ ] Empty/error state untuk halaman petani sekunder (saat ini mock selalu ada).

### C. ML real (Phase 8+, beyond hackathon)
- [ ] Pipeline `pipeline/sentinel.py` - NDVI bulanan Sentinel-2 via GEE.
- [ ] Pipeline `pipeline/weather.py` - ERA5 / BMKG aggregation.
- [ ] Pipeline `pipeline/kementan.py` - parser Excel Kementan yield padi 2018-2024.
- [ ] Re-train RandomForest dengan label Kementan asli penuh (kurangi porsi sintetik).
- [ ] GEE Sentinel-2 NDVI live di `ml_service/predictor.py` (saat ini di-skip karena auth + kuota berat).
- [ ] Retraining loop yang baca `data/feedback.jsonl` periodik.

### D. Produksi (jauh post-hackathon)
- [ ] JWT auth + database (Postgres) menggantikan localStorage fake-role.
- [ ] Halaman registrasi lahan asli (tulis ke DB, bukan mock).
- [ ] WhatsApp Bot integration untuk notifikasi peringatan defisit.
- [ ] Live PIHPS price feed di `/petani/harga`.
- [ ] BMKG forecast di `/petani/cuaca`.

## Anti-scope-creep

Yang sengaja TIDAK dikerjakan dalam hackathon:

- Multi-provinsi (Jabar saja).
- Deep learning (RandomForest cukup untuk skala data hackathon).
- Real-time satellite ingestion (pakai snapshot historis kalau jadi).
- Mobile responsive perfect (Tailwind default sudah cukup).
- PostgreSQL + PostGIS (parquet + JSONL cukup untuk demo).
- Sempurnakan UI (akan didesain ulang post-hackathon).

## Catatan Risiko

1. **NASA POWER offline saat demo** - sudah ditangani: fallback ke nilai default tropis kalau request gagal. Cache 24h.
2. **Express port conflict di Windows** - port 4200 dipilih karena Windows kadang exclude 3945-4044. Kalau masih bermasalah, cek `netsh interface ipv4 show excludedportrange protocol=tcp`.
3. **uvicorn EACCES** - pakai `--host 127.0.0.1`, jangan `0.0.0.0`, di environment yang ketat.
4. **`.next/types/` stale** setelah file rename - hapus folder `frontend/.next/` lalu `npm run dev` ulang.
5. **Model `.joblib` hilang** - jalankan `cd ml_service; python train.py` (~5 detik). ml_service akan otomatis fall back ke `fallback_rules.py` kalau file tidak ada.
6. **Cold start production** - Railway free tier sleep setelah 15 menit idle; siapkan keep-alive ping kalau perlu.
