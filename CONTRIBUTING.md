# Cara Kontribusi

## Setup Awal

```bash
git clone <repo-url>
cd panen-cerdas
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
earthengine authenticate
cp .env.example .env
streamlit run app.py
```

## Branch Strategy

- `main` — selalu jalan, demo-ready
- `dev` — integration branch, semua merge ke sini dulu
- `feat/<nama>` — feature branch per orang, contoh: `feat/sentinel-pipeline`, `feat/dashboard-ui`

```bash
git checkout dev
git pull
git checkout -b feat/your-feature
# kerja
git add .
git commit -m "feat: tambahkan ekstraksi NDVI"
git push origin feat/your-feature
# buka PR ke dev
```

## Aturan Tim

1. **Commit pesan jelas** — `feat: ...`, `fix: ...`, `docs: ...`
2. **Pull dulu sebelum push** — `git pull --rebase origin dev`
3. **Jangan commit data mentah** — `data/raw/` di-gitignore. Share via Google Drive shared folder kalau perlu.
4. **Jangan commit `.env`** — credential GEE, API keys, dll.
5. **Sync di akhir hari** — semua merge ke `dev`, deploy ke staging Streamlit Cloud.
6. **Komunikasi:** kalau stuck > 1 jam, tanya di group chat.

## Pembagian Modul (sesuaikan)

| Orang | Modul Utama | File |
|-------|-------------|------|
| A     | Data pipeline | `pipeline/sentinel.py`, `pipeline/weather.py`, `pipeline/bps.py` |
| B     | ML & features | `pipeline/features.py`, `model/*.py` |
| C     | UI & demo | `app.py`, `pages/*.py`, theming, slide deck |

## Testing

```bash
pytest tests/
```

Tidak wajib unit test lengkap untuk MVP, tapi minimal smoke test `pipeline/` functions.

## Deploy

Streamlit Community Cloud (gratis, ~5 menit setup):
1. Push ke `main`
2. Login ke https://streamlit.io/cloud dengan GitHub
3. Connect repo → deploy
4. Set secrets: `EE_SERVICE_ACCOUNT`, `EE_PRIVATE_KEY` di Streamlit secrets manager
