# 🌾 PanenCerdas — ML Service v2.4

FastAPI service untuk prediksi panen berbasis Machine Learning dengan:
- Data iklim real dari **NASA POWER** (suhu, curah hujan, radiasi matahari)
- NDVI real dari **NASA APPEEARS/MODIS** (MOD13Q1 v061)
- Fitur opsional **hama** (`pest_pressure`) dan **varietas** tanaman
- **9 komoditas**: padi, jagung, kedelai, ubi jalar, ubi kayu, cabe besar, cabe rawit, bawang merah, bawang putih
- Online learning dari feedback petani (auto-retrain setiap 10 feedback baru)

---

## 📁 Struktur File

```
MLservices/
├── main.py                   ← FastAPI app (entry point, versi 2.2.0)
├── model.py                  ← Training & prediksi ML (v2.4 — 9 komoditas)
├── schemas.py                ← Pydantic input/output models (v2.4)
├── fallback_rules.py         ← Rule-based fallback (v2.4 — 9 komoditas)
├── data_fetcher.py           ← Fetch data iklim NASA POWER (v2.4)
├── ndvi_fetcher.py           ← Fetch NDVI dari NASA APPEEARS/MODIS
├── data_cache.py             ← Cache hasil fetch NASA POWER (SQLite/PostgreSQL)
├── database.py               ← ORM & CRUD helpers SQLAlchemy (v2.3)
├── feedback_router.py        ← Router POST /feedback (v2.3)
├── retrain_scheduler.py      ← Auto-retrain (v2.3)
├── train.py                  ← Script training standalone
├── fetch_historical.py       ← Seed data iklim historis NASA POWER (sekali jalan)
├── parse_bps.py              ← Parse data BPS padi → bps_produksi.csv (sekali jalan)
├── requirements.txt          ← Dependencies Python
├── .env                      ← Konfigurasi environment
│
├── data/
│   ├── bps_produksi.csv      ← Data produksi padi per provinsi (output parse_bps.py)
│   ├── bps_template.csv      ← Template CSV untuk isi data BPS manual
│   ├── nasa_power_cache.csv  ← Cache iklim historis (output fetch_historical.py)
│   ├── pest_data.csv         ← Data hama per provinsi & komoditas
│   └── variety_data.csv      ← Data varietas per provinsi & komoditas
│
├── saved_models/
│   ├── harvest_days_model.joblib ← Model prediksi hari panen
│   ├── yield_model.joblib        ← Model prediksi hasil panen (ton/ha)
│   ├── risk_model.joblib         ← Model klasifikasi risiko (low/medium/high)
│   ├── crop_encoder.joblib       ← LabelEncoder untuk crop_type
│   └── feature_meta.joblib       ← Metadata fitur aktif saat training
│
└── Data_Raw/                 ← Data mentah BPS (tidak dibaca langsung oleh service)
    ├── convert_bps_to_training.py
    ├── merge_csv.py
    └── *.csv                 ← CSV lahan & produksi per komoditas per provinsi
```

> **Catatan:** `fetch_historical.py` dan `parse_bps.py` berada di root folder (bukan di subfolder `scripts/`). Jalankan dari dalam folder `MLservices/`.

---

## 🗂️ Komoditas yang Didukung

| Komoditas | `crop_type` | Base Yield (ton/ha) | Base Harvest (hari) |
|---|---|---|---|
| Padi | `padi` | 5.2 (GKP) | 110 |
| Jagung | `jagung` | 5.8 (pipilan kering) | 100 |
| Kedelai | `kedelai` | 1.5 (biji kering) | 85 |
| Ubi Jalar | `ubi_jalar` | 15.0 (umbi segar) | 120 |
| Ubi Kayu | `ubi_kayu` | 20.0 (umbi segar) | 270 |
| Cabe Besar | `cabe_besar` | 8.0 | 90 |
| Cabe Rawit | `cabe_rawit` | 6.0 | 75 |
| Bawang Merah | `bawang_merah` | 9.5 | 65 |
| Bawang Putih | `bawang_putih` | 7.0 | 100 |

---

## 🔌 API Endpoints

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/` | Info service & versi |
| `GET` | `/health` | Status model, feedback, cache |
| `POST` | `/predict` | Prediksi panen |
| `POST` | `/feedback` | Lapor hasil panen nyata (untuk retrain) |
| `GET` | `/feedback/stats` | Statistik feedback terkumpul |
| `GET` | `/feedback/history` | Riwayat feedback per petani |
| `POST` | `/retrain` | Trigger retrain manual (admin) |
| `GET` | `/model/info` | Info model aktif & sumber data |
| `DELETE` | `/cache/expired` | Hapus cache expired (admin) |
| `GET` | `/docs` | Swagger UI interaktif |

---

## ⚙️ Konfigurasi Environment (`.env`)

```env
# Database (default SQLite untuk development)
DATABASE_URL=sqlite:///./panencerdas_ml.db

# Server
HOST=0.0.0.0
PORT=8000

# Auto-retrain
RETRAIN_FEEDBACK_THRESHOLD=10   # retrain setiap N feedback baru
RETRAIN_CRON_HOUR=2             # jam retrain terjadwal (02.00)
RETRAIN_CRON_DAY=sunday         # hari retrain terjadwal

# NASA APPEEARS — untuk NDVI real dari MODIS
# Daftar gratis di: https://appeears.earthdatacloud.nasa.gov/
APPEEARS_USER=email@example.com
APPEEARS_PASS=password_kamu
```

---

## 🏗️ Arsitektur Sistem

```
POST /predict (lat, lon, crop_type, ...)
        │
        ├─── lat/lon tersedia? ─── YA ──→ NASA POWER (iklim) ←── cache 6 jam (SQLite)
        │                                       +
        │                              NASA APPEEARS/MODIS (NDVI) ←── cache 24 jam
        │                              └── fallback: estimasi musiman
        │
        └─── lat/lon tidak ada? ──→ pakai nilai dari request body langsung
                │
                ▼
         model.py → RandomForestRegressor/Classifier
                │    └── fallback: fallback_rules.py (jika model belum ada)
                ▼
         PredictOutput → simpan ke prediction_log (database)
                │
        (petani panen → POST /feedback)
                │
                ▼
         training_feedback (database)
                │
         setiap 10 feedback baru → retrain_scheduler.py
                │
                ▼
         model baru dievaluasi → lebih baik? ganti aktif | lebih buruk? rollback
```

---

## 📝 Catatan Sinkronisasi

- Semua file Python telah sinkron untuk 9 komoditas (`schemas.py`, `model.py`, `fallback_rules.py`, `data_fetcher.py`, `feedback_router.py`)
- `database.py` (v2.3) sudah menyimpan kolom `pest_pressure` dan `variety` di tabel `prediction_log` dan `training_feedback`
- `retrain_scheduler.py` (v2.3) membaca fitur aktif dari `feature_meta.joblib`, bukan hardcode — sinkron dengan `model.py`
- File `temp_padi.csv` di root folder adalah file sementara sisa proses `parse_bps.py` dan bisa dihapus
- File `fetch_historical.py` dan `parse_bps.py` berada di root (bukan `scripts/`), berbeda dari referensi di `train.py` dan README lama
