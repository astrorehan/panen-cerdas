# PanenCerdas - backend setup (Windows PowerShell)
# Run: .\setup-backend.ps1
# Prereq: Python 3.12 installed (py -3.12 --version)

$ErrorActionPreference = "Stop"

Write-Host "PanenCerdas backend setup" -ForegroundColor Green

$pyOk = $false
try {
    $pyVersion = (& py -3.12 --version) 2>$null
    if ($LASTEXITCODE -eq 0) { $pyOk = $true }
} catch {}

if (-not $pyOk) {
    Write-Host "ERROR: Python 3.12 not found." -ForegroundColor Red
    Write-Host "   Install from: https://www.python.org/downloads/release/python-3128/"
    exit 1
}
Write-Host "OK $pyVersion" -ForegroundColor Green

if (Test-Path .venv) {
    Write-Host "Removing existing .venv ..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .venv
}

Write-Host "Creating venv with Python 3.12 ..." -ForegroundColor Cyan
& py -3.12 -m venv .venv

Write-Host "Activating venv ..." -ForegroundColor Cyan
& .\.venv\Scripts\Activate.ps1

Write-Host "Upgrading pip ..." -ForegroundColor Cyan
& python -m pip install --upgrade pip wheel setuptools

Write-Host "Installing ML service deps (1-2 min) ..." -ForegroundColor Cyan
& pip install -r ml_service\requirements.txt

Write-Host ""
Write-Host "Backend ready. Start it with:" -ForegroundColor Green
Write-Host "   .\.venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "   .\ml_service\run.ps1" -ForegroundColor White
Write-Host "   # atau manual: uvicorn main:app --reload --port 8000 --app-dir ml_service" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Then visit:" -ForegroundColor Yellow
Write-Host "   http://localhost:8000/docs  (Swagger UI)" -ForegroundColor White
