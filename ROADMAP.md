# Roadmap 4 Hari - PanenCerdas

> **Pivot 2026-05-11:** Streamlit -> Next.js + FastAPI. UI dijadikan kriteria penilaian UNITY.
> Backend Python (pipeline + model) tidak berubah; hanya layer presentation yang baru.

## Day 1 (HARI INI) - Foundation pivot

**Tujuan:** Semua orang clone repo, jalankan backend + frontend, lihat dashboard dummy.

- [x] Pivot scaffold: hapus Streamlit, tambah `backend/` (FastAPI) + `frontend/` (Next.js 14)
- [x] Dummy endpoints di `/api/dashboard/*`, `/api/predictions`, `/api/regions/geojson`
- [x] 4 halaman frontend: Dashboard, Peta, Detail, Tentang - semua konsumsi backend
- [x] Setup scripts: `setup-backend.ps1`, `setup-frontend.ps1`
- [ ] Setiap orang setup lokal sukses (backend di :8000, frontend di :3000)
- [ ] Setiap orang setup Google Earth Engine account: https://earthengine.google.com/
- [ ] Download shapefile batas kecamatan Jawa Barat dari GADM ke `data/shapefiles/`
- [ ] Download data BPS produksi padi Jabar 2018-2024 ke `data/raw/bps/`

**End-of-day demo:** Buka http://localhost:3000, navigasi 4 halaman, peta dummy muncul, klik kecamatan -> drill-down dummy.

---

## Day 2 - Pipeline + Model

**Tujuan:** Punya CSV bersih `[kecamatan, tahun, bulan, ndvi, rainfall, temp, yield]` + model XGBoost baseline.

- [ ] `pipeline/sentinel.py`: NDVI mean/max per kecamatan per bulan via GEE
- [ ] `pipeline/weather.py`: ERA5 monthly aggregation
- [ ] `pipeline/bps.py`: parse Excel BPS jadi long-format CSV
- [ ] `pipeline/features.py`: join semua sumber, buat lag features
- [ ] `model/train.py`: XGBoost dengan time-based split (train: 2018-2022, test: 2023-2024)
- [ ] Target metrik: **MAPE < 20%** per kecamatan
- [ ] Save model ke `data/models/xgb_padi_jabar.pkl`
- [ ] `model/predict.py`: returns prediksi yield + surplus/defisit per kecamatan

**End-of-day demo:** Notebook menunjukkan prediksi vs aktual untuk 2023-2024.

---

## Day 3 - Bind backend ke ML + UI polish

**Tujuan:** Endpoint backend kembalikan output ML asli (bukan dummy). Frontend tampil polished.

- [ ] Bind `backend/api/dashboard.py` ke aggregate dari `model.predict`
- [ ] Bind `backend/api/predictions.py` ke `model.predict.predict_yield` + `to_surplus_deficit`
- [ ] Bind `backend/api/regions.py` ke shapefile asli (geopandas + simplify)
- [ ] Frontend: state loading, error toasts, skeleton placeholders
- [ ] Frontend: filter dropdown (provinsi, komoditas, musim tanam) - currently hardcoded
- [ ] Frontend: export laporan PDF (opsional - kalau sempat, gunakan `@react-pdf/renderer` atau print stylesheet)
- [ ] Custom favicon + Open Graph image untuk share link

**End-of-day demo:** Full app navigable dengan data real, peta menunjukkan status pangan asli, drill-down per kecamatan menampilkan NDVI time series real.

---

## Day 4 - Deploy + Pitch

**Tujuan:** Public URL, demo video, slide deck. **STOP CODING 6 JAM SEBELUM DEADLINE.**

- [ ] Fix bug dari user testing teman / keluarga
- [ ] Deploy backend ke Railway atau Render (free tier)
- [ ] Deploy frontend ke Vercel (set `NEXT_PUBLIC_API_URL` ke Railway URL)
- [ ] Slide deck: problem -> solusi -> demo -> impact -> roadmap (lihat PDF Ringkasan Fitur)
- [ ] Demo video 2 menit (Loom / OBS)
- [ ] Pitch script - tekankan: "model kami prediksi panen Jabar 2024 dengan error X%, BPS resmi baru rilis Y bulan setelah panen"
- [ ] Buffer 6 jam: hal random pasti rusak (CORS issue di Vercel, cold start Railway, dll)

**End-of-day demo:** Public URL, video, slides - siap submit ke UNITY.

---

## Yang HARUS Anda Skip (Anti-scope-creep)

- ❌ Modul 2-6 dari PDF (Climate Risk, Petani Dashboard, Market Intel, Crowdsourcing) - sebagai mockup di slide saja
- ❌ Multi-komoditas (jagung, kedelai) - habis waktu
- ❌ Deep learning (CNN/LSTM) - XGBoost cukup untuk MVP
- ❌ Real-time satellite ingestion - pakai snapshot historis
- ❌ User auth, login, role-based access
- ❌ WhatsApp bot integration (PDF promise) - mockup screenshot di slide
- ❌ PostgreSQL + PostGIS - parquet + GeoJSON cukup untuk demo. Setup PostgreSQL = 4 jam hilang
- ❌ Mobile responsive sempurna - Tailwind default sudah cukup
- ❌ Semua provinsi Indonesia - Jabar saja

## Risiko Tertinggi

1. **Earth Engine learning curve** - alokasikan 4 jam khusus Day 2 pagi kalau belum pernah pakai.
2. **Cloud cover Sentinel-2** - gunakan SCL mask atau filter `CLOUDY_PIXEL_PERCENTAGE < 20`.
3. **Data leakage** - split by **tahun**, BUKAN random split. Verifikasi sebelum klaim MAPE.
4. **Shapefile mismatch** - nama kecamatan di GADM vs BPS sering beda spelling. Siapkan mapping manual.
5. **BPS Excel chaos** - multi-header, merged cells, footnotes. Alokasikan 2 jam khusus cleaning.
6. **CORS production** - inget update `cors_origins` di `backend/core/config.py` setelah dapat URL Vercel.
7. **Vercel + react-leaflet SSR** - sudah di-handle pakai `dynamic({ ssr: false })`, tapi cek setelah deploy.
