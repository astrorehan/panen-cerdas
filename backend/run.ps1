# Backend dev server — Windows PowerShell
# Run from project root: .\backend\run.ps1
& .\.venv\Scripts\Activate.ps1
& uvicorn backend.main:app --reload --port 8000 --host 0.0.0.0
