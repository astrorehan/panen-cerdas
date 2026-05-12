# ML service dev server - Windows PowerShell
# Run from project root: .\ml_service\run.ps1
& .\.venv\Scripts\Activate.ps1
& uvicorn ml_service.main:app --reload --port 8000 --host 0.0.0.0
