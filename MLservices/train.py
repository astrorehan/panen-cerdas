"""
train.py
--------
Script untuk melatih model ML PanenCerdas.

Jalankan SEKALI sebelum server pertama kali:
    python train.py

Atau setelah fetch data historis dari NASA POWER:
    python scripts/fetch_historical.py
    python train.py

Mode training:
  - Tanpa argumen        : pakai data dari data/ + synthetic fallback
  - --with-db            : juga load feedback petani dari database
"""

import sys
import argparse
from pathlib import Path
from model import train_and_save, load_models


def parse_args():
    parser = argparse.ArgumentParser(description="PanenCerdas Model Trainer")
    parser.add_argument(
        "--with-db",
        action="store_true",
        help="Load juga feedback petani dari database (butuh database sudah running)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    print("=" * 55)
    print("  🌾 PanenCerdas — Model Training Script")
    print("=" * 55)

    # Cek apakah ada data real di folder data/
    data_dir = Path(__file__).parent / "data"
    has_nasa  = (data_dir / "nasa_power_cache.csv").exists()
    has_bps   = (data_dir / "bps_produksi.csv").exists()

    print("\n📂 Sumber data yang tersedia:")
    print(f"   NASA POWER cache  : {'✅ ada' if has_nasa else '❌ belum ada (jalankan scripts/fetch_historical.py)'}")
    print(f"   BPS produksi CSV  : {'✅ ada' if has_bps  else '⚠️  tidak ada (opsional, isi manual dari bps.go.id)'}")

    db = None
    if args.with_db:
        print("\n🔌 Menghubungkan ke database untuk load feedback petani...")
        try:
            from database import init_db, SessionLocal
            init_db()
            db = SessionLocal()
            print("   ✅ Database terhubung")
        except Exception as e:
            print(f"   ⚠️  Gagal konek database: {e}")
            print("   → Lanjut training tanpa feedback petani")
            db = None

    print("\n🚀 Mulai training...\n")

    try:
        metrics = train_and_save(db=db)
    finally:
        if db:
            db.close()

    print("\n📊 Hasil Training:")
    print(f"   Data real      : {metrics.get('n_real', 0)} baris")
    print(f"   Data synthetic : {metrics.get('n_synthetic', 0)} baris")
    print(f"   MAE Harvest    : ±{metrics['mae_harvest_days']} hari")
    print(f"   MAE Yield      : ±{metrics['mae_yield']} ton/ha")
    print(f"   Risk Accuracy  : {metrics['risk_accuracy']:.1%}")

    print("\n🔄 Memuat model yang baru dilatih...")
    ok = load_models()
    if ok:
        print("\n✅ Model siap! Jalankan server dengan:")
        print("   python main.py")
    else:
        print("\n❌ Gagal memuat model — periksa direktori saved_models/")
        sys.exit(1)
