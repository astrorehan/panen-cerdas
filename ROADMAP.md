# Roadmap 4 Hari — PanenCerdas

## Day 1 (HARI INI) — Foundation

**Tujuan:** Repo siap, semua orang bisa `streamlit run` dan lihat app jalan dengan data dummy.

- [x] Scaffold project structure
- [x] Setup Streamlit theme + nav
- [x] Stub semua modul pipeline & model
- [x] README + ROADMAP + CONTRIBUTING
- [ ] Setiap orang clone repo, `pip install -r requirements.txt`, run app sukses
- [ ] Setup Google Earth Engine account (semua orang) — register di https://earthengine.google.com/
- [ ] Download shapefile batas kecamatan Jawa Barat dari [GADM](https://gadm.org/download_country.html) → simpan di `data/shapefiles/`
- [ ] Download data BPS produksi padi Jabar 2018-2024 → `data/raw/bps/`

**End-of-day demo:** App jalan, peta Jabar muncul (kosong/dummy), nav bisa di-klik.

---

## Day 2 — Pipeline + Model Baseline

**Tujuan:** Punya 1 CSV bersih `[kecamatan, tahun, bulan, ndvi, rainfall, temp, yield]` dan baseline model.

- [ ] `pipeline/sentinel.py`: ekstrak NDVI mean/max per kecamatan per bulan via GEE
- [ ] `pipeline/weather.py`: ambil ERA5 (atau BMKG kalau API stabil) — curah hujan, suhu
- [ ] `pipeline/bps.py`: parse Excel BPS jadi long-format CSV
- [ ] `pipeline/features.py`: join semua, buat lag features (NDVI T-3, T-2, T-1)
- [ ] `model/train.py`: XGBoost dengan time-based split (train: 2018-2022, test: 2023-2024)
- [ ] Target metrik: **MAPE < 20%** per kecamatan (acceptable untuk MVP)
- [ ] Simpan model ke `data/models/xgb_padi_jabar.pkl`

**End-of-day demo:** Notebook menunjukkan prediksi vs aktual, scatter plot, feature importance.

---

## Day 3 — UI Polish + Surplus/Defisit Logic

**Tujuan:** App terlihat seperti produk asli, bukan demo skripsi.

- [ ] `pages/2_Peta_Prediksi.py`: choropleth merah/hijau, klik kecamatan → drill-down
- [ ] `pages/3_Detail_Kecamatan.py`: time series NDVI, prediksi vs historis, confidence interval
- [ ] `pages/1_Dashboard.py`: KPI tiles (total prediksi produksi, surplus/defisit provinsi, akurasi model)
- [ ] Surplus/defisit logic: `predicted_yield_ton_per_ha × luas_panen − konsumsi_kabupaten`
- [ ] Export laporan PDF (opsional, kalau sempat) — pakai `streamlit-pdf-generator` atau `reportlab`
- [ ] Custom CSS untuk metric cards, hero section di dashboard

**End-of-day demo:** Full app navigable, peta interaktif, drill-down jalan, angka surplus/defisit muncul.

---

## Day 4 — Polish + Pitch

**Tujuan:** Deploy, slide deck, demo video. **STOP CODING 6 JAM SEBELUM DEADLINE.**

- [ ] Fix bug dari hasil testing teman/keluarga
- [ ] Deploy ke Streamlit Community Cloud (gratis): https://streamlit.io/cloud
- [ ] Slide deck: problem → solusi → demo → impact → roadmap
- [ ] Demo video 2 menit (Loom / OBS)
- [ ] Pitch script — tekankan: "model kami prediksi panen Jabar 2024 dengan error X%, BPS resmi baru rilis Y bulan setelah panen"
- [ ] Buffer 6 jam: hal random pasti rusak

**End-of-day demo:** Public URL, video, slides — siap submit.

---

## Yang HARUS Anda Skip (Anti-scope-creep)

- ❌ Multi-komoditas (jagung, kedelai) — habis waktu
- ❌ Deep learning (CNN/LSTM) — XGBoost cukup untuk MVP
- ❌ Real-time satellite ingestion — pakai snapshot historis
- ❌ User auth, login, role-based access — tidak relevan untuk demo
- ❌ Mobile responsive sempurna — Streamlit default OK
- ❌ Database production-grade — CSV/parquet di `data/` cukup
- ❌ BMKG scraping kalau API tidak stabil — pakai ERA5 dari GEE, sebut BMKG di pitch
- ❌ Semua provinsi Indonesia — Jabar saja dulu

## Risiko Tertinggi

1. **Earth Engine learning curve** — kalau ada anggota tim belum pernah, alokasikan 4 jam khusus Day 2 pagi.
2. **Cloud cover Sentinel-2** — gunakan `s2cloudless` atau filter `CLOUDY_PIXEL_PERCENTAGE < 20`.
3. **Data leakage** — split by **tahun**, BUKAN random split. Verifikasi sebelum klaim MAPE.
4. **Shapefile mismatch** — nama kecamatan di GADM vs BPS sering beda spelling. Siapkan mapping manual.
5. **BPS Excel chaos** — multi-header, merged cells, footnotes. Alokasikan 2 jam khusus cleaning.
