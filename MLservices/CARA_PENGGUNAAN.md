# 📖 Cara Penggunaan — PanenCerdas ML Service v2.4

---

## 🧠 Konsep Singkat

Model PanenCerdas **belajar dari hasil panen nyata petani**.
Semakin banyak petani melaporkan hasilnya → model makin akurat.

```
Petani input kondisi lahan
         ↓
    POST /predict
         ↓
  Simpan ke database ──→ prediction_log (prediction_log_id dikembalikan)
         ↓
   Petani panen (tunggu beberapa hari/minggu)
         ↓
  Petani lapor hasil nyata
         ↓
    POST /feedback (pakai prediction_log_id tadi)
         ↓
  Terkumpul 10 feedback baru → retrain otomatis
         ↓
  Model baru dievaluasi → lebih baik? ganti | lebih buruk? rollback
```

---

## 🪜 Step-by-Step Cara Pakai

---

### STEP 0 — Persiapan (sekali jalan)

#### 0a. Clone & masuk ke folder

```bash
cd MLservices
```

#### 0b. Buat virtual environment (disarankan)

```bash
python -m venv venv
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows
```

#### 0c. Install dependencies

```bash
pip install -r requirements.txt
```

#### 0d. Siapkan file `.env`

Salin konfigurasi default sudah tersedia di `.env`. Untuk NDVI real dari MODIS, isi kredensial NASA APPEEARS:

```env
APPEEARS_USER=email_kamu@gmail.com
APPEEARS_PASS=password_kamu
```

> **Tanpa APPEEARS**: service tetap berjalan normal — NDVI akan menggunakan estimasi musiman sebagai fallback.

---

### STEP 1 — (Opsional) Fetch Data Historis NASA POWER

Langkah ini akan men-generate `data/nasa_power_cache.csv` berisi data iklim 9 komoditas dari sentra produksi nyata.

```bash
# Dengan NDVI real dari APPEEARS (~15–25 menit, perlu akun APPEEARS)
python fetch_historical.py

# Tanpa NDVI real (~2–5 menit, NDVI pakai estimasi musiman)
python fetch_historical.py --skip-ndvi
```

> File `fetch_historical.py` dan `parse_bps.py` berada di **root folder** `MLservices/`, bukan di subfolder `scripts/`.

---

### STEP 2 — (Opsional) Parse Data BPS Padi

Langkah ini men-generate `data/bps_produksi.csv` dari data BPS produksi padi per provinsi:

```bash
python parse_bps.py
```

---

### STEP 3 — Training Model

```bash
# Training dasar (pakai bps_produksi.csv + nasa_power_cache.csv + synthetic fallback)
python train.py

# Training dengan feedback petani dari database (jika sudah ada)
python train.py --with-db
```

Output yang diharapkan:
```
✅ Semua model tersimpan di saved_models/
   MAE harvest_days : ±X.X hari
   MAE yield        : ±X.XX ton/ha
   Accuracy risk    : XX.X%
✅ Model siap! Jalankan server dengan: python main.py
```

> Model yang sudah dilatih tersimpan di `saved_models/`. Jika folder ini sudah ada isinya (seperti sekarang), bisa langsung lanjut ke STEP 4.

---

### STEP 4 — Jalankan Server

```bash
python main.py
```

Server berjalan di: `http://localhost:8000`
Swagger UI: `http://localhost:8000/docs`

---

## 🌾 Cara Pakai Endpoint

---

### POST `/predict` — Prediksi Panen

**Mode 1: Manual (tanpa koordinat)**

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "ndvi": 0.7,
    "rainfall_mm": 150.0,
    "temperature_c": 27.0,
    "solar_radiation": 200.0,
    "land_area_ha": 1.5,
    "crop_type": "padi",
    "variety": "Ciherang",
    "pest_pressure": 0.3
  }'
```

**Mode 2: Otomatis (dengan koordinat GPS)**

Jika `lat` dan `lon` diisi, data iklim dan NDVI diambil otomatis dari NASA:

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "ndvi": 0.0,
    "rainfall_mm": 0.0,
    "temperature_c": 25.0,
    "solar_radiation": 0.0,
    "land_area_ha": 1.5,
    "crop_type": "bawang_merah",
    "variety": "Bima Brebes",
    "lat": -6.90,
    "lon": 109.13
  }'
```

> Nilai `ndvi`, `rainfall_mm`, dan `solar_radiation` akan di-override dari NASA jika `lat`/`lon` diisi.

**Contoh Response:**

```json
{
  "prediction_log_id": 42,
  "harvest_days": 68,
  "yield_ton_per_ha": 9.8,
  "total_yield_ton": 14.7,
  "risk_level": "low",
  "risk_score": 0.15,
  "recommendations": ["Kondisi lahan baik", "Jaga kelembapan tanah"],
  "model_source": "ml_model",
  "confidence": 0.84,
  "climate_source": "nasa_power",
  "ndvi_source": "modis_appeears"
}
```

> Simpan `prediction_log_id` — digunakan saat lapor feedback.

---

### POST `/feedback` — Lapor Hasil Panen Nyata

```bash
curl -X POST http://localhost:8000/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "prediction_log_id": 42,
    "ndvi": 0.7,
    "rainfall_mm": 150.0,
    "temperature_c": 27.0,
    "solar_radiation": 200.0,
    "land_area_ha": 1.5,
    "crop_type": "bawang_merah",
    "variety": "Bima Brebes",
    "pest_pressure": 0.3,
    "actual_harvest_days": 65,
    "actual_yield_ton_per_ha": 9.5,
    "actual_risk_level": "low",
    "petani_id": "P001",
    "lahan_id": "L001",
    "catatan": "Panen normal, sedikit serangan thrips"
  }'
```

---

### GET `/health` — Cek Status Service

```bash
curl http://localhost:8000/health
```

---

### GET `/feedback/stats` — Statistik Feedback

```bash
curl http://localhost:8000/feedback/stats
```

---

### POST `/retrain` — Trigger Retrain Manual (Admin)

```bash
# Retrain hanya jika threshold terpenuhi
curl -X POST http://localhost:8000/retrain

# Retrain paksa meski belum cukup feedback
curl -X POST "http://localhost:8000/retrain?force=true"
```

---

### DELETE `/cache/expired` — Bersihkan Cache Expired

```bash
curl -X DELETE http://localhost:8000/cache/expired
```

---

## 📋 Daftar Varietas yang Dikenali

| Komoditas | Varietas |
|---|---|
| Padi | IR64, Ciherang, Inpari32, Memberamo, Lokal |
| Jagung | NK7328, Pioneer36, Bisi18, Lokal |
| Kedelai | Anjasmoro, Dena1, Grobogan, Lokal |
| Ubi Jalar | Cilembu, Papua Solossa, Sukuh, Lokal |
| Ubi Kayu | UJ5, Adira1, Malang6, Lokal |
| Cabe Besar | Lado, Tit Super, Gada, Lokal |
| Cabe Rawit | Pelita, Dewata, Ori, Lokal |
| Bawang Merah | Bima Brebes, Tajuk, Katumi, Lokal |
| Bawang Putih | Lumbu Hijau, Tawangmangu, Kesuma, Lokal |

> Varietas yang tidak dikenal otomatis di-fallback ke `"Lokal"`.

---

## ⚙️ Nilai `pest_pressure` (Tingkat Serangan Hama)

| Nilai | Kategori |
|---|---|
| `0.0` | Tidak ada serangan |
| `0.3` | Serangan ringan |
| `0.6` | Serangan sedang |
| `0.9` | Serangan berat |

Nama hama spesifik juga bisa digunakan langsung (dikonversi otomatis di `model.py`):
`wereng_coklat`, `blast`, `penggerek_batang`, `ulat_grayak`, `bulai`, `antraknosa`, `thrips`, `fusarium`, dll.

---

## 🔄 Alur Auto-Retrain

1. Setiap **10 feedback baru** masuk → retrain otomatis dipicu
2. Setiap **Minggu pukul 02.00** → scheduled retrain
3. Model baru dievaluasi vs model lama:
   - Jika lebih baik → model aktif diganti
   - Jika lebih buruk → rollback ke model lama
4. Versi model tersimpan di tabel `model_version` (database)

---

## 🐛 Troubleshooting

| Masalah | Solusi |
|---|---|
| `Model belum ada — jalankan: python train.py` | Jalankan `python train.py` terlebih dahulu |
| NDVI selalu `seasonal_estimate` | Isi `APPEEARS_USER` dan `APPEEARS_PASS` di `.env` |
| `climate_source: default_fallback` | API NASA POWER tidak terjangkau — cek koneksi internet |
| Varietas tidak dikenali | Gunakan nama persis seperti di tabel varietas di atas, atau `"Lokal"` |
| `crop_type not in trained_crops` | Jalankan ulang `python train.py` agar semua 9 komoditas ter-encode |
| Port 8000 sudah dipakai | Ubah `PORT=8001` di `.env` dan jalankan `python main.py` |
