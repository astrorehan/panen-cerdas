# 🌾 PanenCerdas — ML Service v2.3

FastAPI service untuk prediksi panen berbasis Machine Learning dengan:
- Data iklim real dari **NASA POWER**
- NDVI real dari **NASA APPEEARS/MODIS**
- Fitur opsional **hama** dan **varietas** (dummy atau real)
- Online learning dari feedback petani

---

## 📁 Struktur File

```
MLservices/
├── main.py                   ← FastAPI app (entry point)
├── model.py                  ← Training & prediksi ML (v2.3 — ada hama & varietas)
├── schemas.py                ← Pydantic input/output models
├── fallback_rules.py         ← Rule-based fallback (tanpa model)
├── data_fetcher.py           ← Fetch data iklim dari NASA POWER
├── data_cache.py             ← Cache hasil fetch NASA POWER (SQLite)
├── database.py               ← ORM & CRUD helpers (SQLAlchemy)
├── feedback_router.py        ← Router POST /feedback
├── retrain_scheduler.py      ← Auto-retrain tiap 10 feedback / tiap Minggu
├── train.py                  ← Script training standalone
├── requirements.txt          ← Dependencies Python
├── .env                      ← Konfigurasi (database, server, NASA credentials)
│
├── scripts/
│   └── fetch_historical.py   ← Seed data iklim historis NASA POWER (sekali jalan)
│
├── data/
│   ├── nasa_power_cache.csv  ← ✅ Data real (sudah ada, hasil fetch_historical.py)
│   ├── bps_template.csv      ← ⚠️  Data BPS (masih dummy — isi dengan data real)
│   ├── pest_data.csv         ← 🆕 Data hama (dummy, bisa diganti data real)
│   └── variety_data.csv      ← 🆕 Data varietas (dummy, bisa diganti data real)
│
└── saved_models/             ← Auto-dibuat saat train
    ├── harvest_days_model.joblib
    ├── yield_model.joblib
    ├── risk_model.joblib
    ├── crop_encoder.joblib
    └── feature_meta.joblib   ← 🆕 Metadata fitur (hama/varietas on/off)
```

---

## ⚡ Cara Menjalankan (Step-by-Step)

### Step 1 — Masuk ke folder

```bash
cd MLservices
```

### Step 2 — Buat virtual environment

```bash
python -m venv venv

# Linux/Mac:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Konfigurasi `.env`

File `.env` sudah ada, cek bagian ini:

```env
DATABASE_URL=sqlite:///./panencerdas_ml.db   # development (zero-config)
# DATABASE_URL=postgresql://user:pass@localhost:5432/panencerdas   # production

APPEARS_USER=email_kamu@gmail.com   # daftar gratis di appeears.earthdatacloud.nasa.gov
APPEARS_PASS=password_kamu          # kosongkan jika tidak punya (NDVI pakai estimasi)
```

### Step 5 — Konfigurasi fitur hama & varietas

Buka `model.py`, bagian paling atas (setelah import):

```python
USE_PEST    = True   # ← ubah ke False jika skip hama sama sekali
USE_VARIETY = True   # ← ubah ke False jika skip varietas sama sekali
```

| Kondisi | Setting |
|---------|---------|
| Punya data hama real | `USE_PEST = True`, taruh di `data/pest_data.csv` |
| Tidak punya, pakai dummy | `USE_PEST = True` (default — dummy sudah ada) |
| Skip sama sekali | `USE_PEST = False` |
| Punya data varietas real | `USE_VARIETY = True`, taruh di `data/variety_data.csv` |
| Tidak punya, pakai dummy | `USE_VARIETY = True` (default — dummy sudah ada) |
| Skip sama sekali | `USE_VARIETY = False` |

### Step 6 — Update schemas.py (wajib jika USE_PEST atau USE_VARIETY = True)

Tambahkan dua field opsional ke class `PredictInput` di `schemas.py`:

```python
# Tambahkan setelah field `lon`:

pest_pressure: Optional[float] = Field(
    default=None,
    ge=0.0, le=1.0,
    description=(
        "Tingkat serangan hama (0.0 = tidak ada, 1.0 = sangat parah). "
        "Opsional. Default: 0.0."
    ),
    examples=[0.3],
)
variety: Optional[str] = Field(
    default=None,
    description=(
        "Nama varietas tanaman. Opsional. Default: Lokal. "
        "Padi: IR64, Ciherang, Inpari32, Memberamo, Lokal. "
        "Jagung: NK7328, Pioneer36, Bisi18, Lokal. "
        "Kedelai: Anjasmoro, Dena1, Grobogan, Lokal. "
        "Singkong: UJ3, Adira1, Malang6, Lokal."
    ),
    examples=["Ciherang"],
)
```

### Step 7 — Latih model

```bash
# Training dengan semua data yang ada:
python train.py

# Training + sertakan feedback petani dari database:
python train.py --with-db
```

Output yang diharapkan:

```
🌱 Menyiapkan data training...
   Fitur aktif    : ['ndvi', 'rainfall_mm', 'temperature_c', 'solar_radiation',
                     'land_area_ha', 'crop_encoded', 'pest_pressure', 'variety_encoded']
   Fitur hama     : ✅ aktif
   Fitur varietas : ✅ aktif
   Total data     : 2023 baris (23 real + 2000 synthetic)
🤖 Training harvest_days model (RandomForest)...
   MAE harvest_days: ±6.8 hari
🌾 Training yield model (RandomForest)...
   MAE yield: ±0.30 ton/ha
⚠️  Training risk classifier (RandomForest)...
   Accuracy risk: 94.1%
✅ Semua model tersimpan di saved_models/
```

### Step 8 — Jalankan server

```bash
python main.py
```

Server: **http://localhost:8000**
Swagger UI: **http://localhost:8000/docs**

---

## 🔗 Endpoint Lengkap

| Method | URL | Keterangan |
|--------|-----|------------|
| GET | `/` | Info service |
| GET | `/health` | Status model, feedback, cache |
| POST | `/predict` | **Prediksi panen** |
| POST | `/retrain` | Trigger retrain manual |
| GET | `/model/info` | Versi model & metrik |
| DELETE | `/cache/expired` | Hapus cache iklim expired |
| POST | `/feedback` | Petani lapor hasil panen nyata |
| GET | `/feedback/stats` | Statistik feedback |
| GET | `/feedback/history` | Riwayat feedback per petani |
| GET | `/docs` | Swagger UI |

---

## 📥 Contoh Request — POST /predict

### Minimal (tanpa koordinat, tanpa hama/varietas):

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "ndvi": 0.7,
    "rainfall_mm": 150,
    "temperature_c": 27,
    "solar_radiation": 200,
    "land_area_ha": 1.5,
    "crop_type": "padi"
  }'
```

### Dengan koordinat (NASA POWER otomatis):

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "ndvi": 0.7,
    "rainfall_mm": 0,
    "temperature_c": 0,
    "solar_radiation": 0,
    "land_area_ha": 1.5,
    "crop_type": "padi",
    "lat": -7.25,
    "lon": 112.75
  }'
```

### Dengan data hama & varietas (v2.3):

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "ndvi": 0.65,
    "rainfall_mm": 180,
    "temperature_c": 27,
    "solar_radiation": 195,
    "land_area_ha": 2.0,
    "crop_type": "padi",
    "lat": -7.25,
    "lon": 112.75,
    "pest_pressure": 0.6,
    "variety": "Ciherang"
  }'
```

### Contoh response:

```json
{
  "prediction_log_id": 42,
  "harvest_days": 105,
  "yield_ton_per_ha": 5.3,
  "total_yield_ton": 10.6,
  "risk_level": "medium",
  "risk_score": 0.5,
  "recommendations": [
    "💧 Tingkatkan irigasi — curah hujan di bawah optimal",
    "🐛 Waspadai serangan hama sedang — pantau lahan tiap 3 hari"
  ],
  "model_source": "ml_model",
  "confidence": 0.87,
  "climate_source": "nasa_power",
  "ndvi_source": "seasonal_estimate"
}
```

---

## 📊 Status Data & Kontribusi ke Model

| File | Status | Jumlah Baris | Kontribusi |
|------|--------|-------------|------------|
| `nasa_power_cache.csv` | ✅ Real | 20 | Data iklim 20 lokasi Indonesia |
| `bps_template.csv` | ⚠️ Dummy | 3 | Sangat kecil — isi data real |
| `pest_data.csv` | 🔶 Dummy | 18 | Hanya dipakai untuk generate synthetic |
| `variety_data.csv` | 🔶 Dummy | 26 | Hanya dipakai untuk generate synthetic |
| Feedback petani (DB) | 🔄 Akumulasi | Bertambah | Meningkat seiring pemakaian |
| Synthetic | 🤖 Auto | ~1960 | Pelengkap hingga 2000 baris total |

---

## 🔄 Alur Data di Model (v2.3)

```
Data Real:
  nasa_power_cache.csv  → iklim (suhu, hujan, radiasi, ndvi)   [20 baris]
  bps_template.csv      → produksi BPS                          [3 baris dummy]
  pest_data.csv         → hama                                  [18 baris dummy]
  variety_data.csv      → varietas                              [26 baris dummy]
  Feedback petani (DB)  → hasil panen nyata                     [akumulasi]

         ↓ jika total < 2000 baris
  Synthetic data        → auto-generate berbasis domain knowledge

         ↓
  Fitur Model:
    WAJIB   : ndvi, rainfall_mm, temperature_c, solar_radiation, land_area_ha, crop_encoded
    OPSIONAL: pest_pressure   (aktif jika USE_PEST=True)
    OPSIONAL: variety_encoded (aktif jika USE_VARIETY=True)

         ↓
  3 Model Random Forest:
    harvest_days_model  → prediksi hari panen
    yield_model         → prediksi hasil panen (ton/ha)
    risk_model          → klasifikasi risiko (low/medium/high)
```

---

## 📄 Format Data Hama Real (`pest_data.csv`)

Jika kamu mendapat data dari Dinas Pertanian / BBPOPT / Kementan:

```csv
provinsi,crop_type,tahun,musim,pest_type,pest_pressure,luas_terserang_ha,keterangan
Jawa Timur,padi,2024,MH,wereng_coklat,0.7,120,Serangan berat di Kabupaten Jember
```

Kolom wajib: `provinsi`, `crop_type`, `tahun`, `pest_pressure`

Cara menghitung `pest_pressure` dari data luas serangan:
```
pest_pressure = luas_terserang_ha / luas_tanam_total_ha
# Clip ke rentang 0.0–1.0
```

Atau gunakan kategori:
- `0.0` = tidak ada serangan
- `0.3` = ringan (< 10% tanaman terinfeksi)
- `0.6` = sedang (10–30%)
- `0.9` = berat (> 30%)

---

## 📄 Format Data Varietas Real (`variety_data.csv`)

Jika kamu mendapat data dari BPSB / Dinas Pertanian / survei lapangan:

```csv
provinsi,crop_type,tahun,variety,luas_tanam_ha,keterangan
Jawa Timur,padi,2024,Ciherang,850,Dominan di sawah irigasi
```

Kolom wajib: `provinsi`, `crop_type`, `tahun`, `variety`

Nama varietas yang saat ini dikenali model:

| Tanaman | Varietas |
|---------|----------|
| padi | IR64, Ciherang, Inpari32, Memberamo, Lokal |
| jagung | NK7328, Pioneer36, Bisi18, Lokal |
| kedelai | Anjasmoro, Dena1, Grobogan, Lokal |
| singkong | UJ3, Adira1, Malang6, Lokal |

Untuk menambah varietas baru, edit `VARIETY_CATALOG` di `model.py`.

---

## 🖥️ Panduan Backend Node.js

### Endpoint utama yang dipanggil backend:

```javascript
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// POST /predict
async function predictHarvest(inputData) {
  const response = await fetch(`${ML_SERVICE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputData),
    signal: AbortSignal.timeout(10000),
  });
  return response.json();
}

// GET /health — untuk cek apakah ML service jalan
async function checkHealth() {
  const response = await fetch(`${ML_SERVICE_URL}/health`);
  return response.json();
}
```

### Field request lengkap (v2.3):

```javascript
const requestBody = {
  // Wajib:
  ndvi: 0.7,                  // float 0.0–1.0
  rainfall_mm: 150,           // float >= 0
  temperature_c: 27,          // float 10–50
  solar_radiation: 200,       // float >= 0
  land_area_ha: 1.5,          // float > 0
  crop_type: "padi",          // "padi" | "jagung" | "kedelai" | "singkong"

  // Opsional — iklim real:
  lat: -7.25,                 // float -11 to 6 (Indonesia)
  lon: 112.75,                // float 95 to 141

  // Opsional — hama & varietas (v2.3):
  pest_pressure: 0.3,         // float 0.0–1.0, default 0.0
  variety: "Ciherang",        // string, default "Lokal"
};
```

### Mapping jenis hama dari input pengguna:

```javascript
const PEST_PRESSURE_MAP = {
  tidak_ada: 0.0,
  ringan: 0.3,
  sedang: 0.6,
  berat: 0.9,
  wereng_coklat: 0.7,
  blast: 0.8,
  penggerek_batang: 0.5,
  ulat_grayak: 0.6,
  busuk_batang: 0.75,
  kutu_daun: 0.4,
};
```

### Varietas per tanaman (untuk dropdown):

```javascript
const VARIETY_OPTIONS = {
  padi:     ['Lokal', 'IR64', 'Ciherang', 'Inpari32', 'Memberamo'],
  jagung:   ['Lokal', 'NK7328', 'Pioneer36', 'Bisi18'],
  kedelai:  ['Lokal', 'Anjasmoro', 'Dena1', 'Grobogan'],
  singkong: ['Lokal', 'UJ3', 'Adira1', 'Malang6'],
};
```

### Environment variables backend:

```env
ML_SERVICE_URL=http://localhost:8000      # development
# ML_SERVICE_URL=http://ml-service:8000   # Docker/production
```

---

## 📱 Panduan Frontend

### Form prediksi — field yang dibutuhkan:

**Selalu tampilkan:**
- Dropdown `crop_type`: Padi / Jagung / Kedelai / Singkong
- Input `land_area_ha`: Luas lahan (hektar)

**Pilihan input iklim (salah satu):**
- Koordinat GPS (`lat`, `lon`) → ambil dari browser geolocation / klik peta
- Manual: input `ndvi`, `rainfall_mm`, `temperature_c`, `solar_radiation`

**Field opsional v2.3:**
- Dropdown `variety`: dinamis berubah sesuai `crop_type` yang dipilih
- Dropdown `pest_level`: Tidak Ada / Ringan / Sedang / Berat → konversi ke `pest_pressure`

### Data untuk dropdown frontend:

```javascript
// Varietas — berubah otomatis saat crop_type berubah
const VARIETY_OPTIONS = {
  padi:     ['Lokal', 'IR64', 'Ciherang', 'Inpari32', 'Memberamo'],
  jagung:   ['Lokal', 'NK7328', 'Pioneer36', 'Bisi18'],
  kedelai:  ['Lokal', 'Anjasmoro', 'Dena1', 'Grobogan'],
  singkong: ['Lokal', 'UJ3', 'Adira1', 'Malang6'],
};

// Tingkat hama — konversi ke pest_pressure sebelum kirim ke backend
const PEST_LEVEL_OPTIONS = [
  { label: 'Tidak Ada',      value: 0.0, description: 'Lahan bersih' },
  { label: 'Ringan',         value: 0.3, description: '< 10% tanaman terserang' },
  { label: 'Sedang',         value: 0.6, description: '10–30% tanaman terserang' },
  { label: 'Berat',          value: 0.9, description: '> 30% tanaman terserang' },
];
```

### Menampilkan hasil prediksi:

| Field response | Cara tampil |
|---------------|-------------|
| `harvest_days` | "Perkiraan panen dalam **105 hari**" |
| `yield_ton_per_ha` | "Estimasi hasil: **5.3 ton/ha**" |
| `total_yield_ton` | "Total produksi: **~7.95 ton**" |
| `risk_level` | Badge warna: `low`=hijau, `medium`=kuning, `high`=merah |
| `confidence` | "Tingkat kepercayaan: **87%**" |
| `recommendations` | Kartu/list dengan icon emoji |
| `climate_source` | Chip kecil: "Data: NASA POWER" atau "Data: Manual" |

### Form laporan panen (setelah panen):

```javascript
// POST ke backend → backend forward ke ML Service /feedback
const feedbackBody = {
  prediction_log_id: 42,           // disimpan dari response /predict
  actual_harvest_days: 108,
  actual_yield_ton_per_ha: 5.1,
  notes: "Ada sedikit serangan wereng di akhir",  // opsional
};
```

---

## ❓ FAQ

**Q: Data BPS masih dummy, apakah sudah masuk ke model?**

Ya. `bps_template.csv` sudah dibaca oleh `model.py`. Karena hanya 3 baris, kontribusinya sangat kecil dan model masih dominan pakai synthetic + NASA POWER. Begitu kamu isi dengan data BPS real, porsinya otomatis meningkat.

**Q: Apakah bisa pakai model tanpa hama dan varietas?**

Ya. Set `USE_PEST = False` dan `USE_VARIETY = False` di `model.py`, lalu retrain. Model akan berjalan seperti versi v2.2.

**Q: Kalau dapat data hama/varietas real nanti, apa yang harus dilakukan?**

Cukup taruh file CSV di folder `data/` sesuai format di atas. Pastikan `USE_PEST=True` / `USE_VARIETY=True`, lalu jalankan `python train.py` untuk retrain.

**Q: Model retrain otomatis kapan?**

Ada dua trigger: (1) setiap 10 feedback baru dari petani, (2) tiap Minggu pukul 02.00. Bisa trigger manual via `POST /retrain?force=true`.

**Q: Apakah data hama & varietas dari `pest_data.csv` dan `variety_data.csv` langsung masuk ke fitur model?**

Belum secara langsung — saat ini file tersebut dibaca tapi belum di-join ke data training utama (perlu lokasi yang cocok). Yang sudah masuk adalah kolom `pest_pressure` dan `variety` yang diisi default (`0.0` dan `Lokal`) ke semua data NASA POWER dan BPS. Data dummy dari dua file itu digunakan sebagai **referensi untuk mengisi kolom synthetic data**, sehingga distribusi hama dan varietas di synthetic data lebih realistis.
