# PanenCerdas — one-shot setup script (Windows PowerShell)
# Run: .\setup.ps1
#
# Prereq: Python 3.12 installed. Check with: py -3.12 --version
# Download Python 3.12: https://www.python.org/downloads/release/python-3128/
# During install, tick "Add Python to PATH" and "py launcher".

$ErrorActionPreference = "Stop"

Write-Host "PanenCerdas setup — Day 1" -ForegroundColor Green

# 1. Verify Python 3.12 is available
try {
    $pyVersion = & py -3.12 --version 2>&1
    Write-Host "OK $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python 3.12 not found." -ForegroundColor Red
    Write-Host "   Install from: https://www.python.org/downloads/release/python-3128/"
    Write-Host "   Tick 'Add Python to PATH' and 'py launcher' during install."
    exit 1
}

# 2. Remove old venv if it exists (and was made with wrong Python)
if (Test-Path .venv) {
    Write-Host "Removing existing .venv ..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .venv
}

# 3. Create fresh venv with Python 3.12
Write-Host "Creating venv with Python 3.12 ..." -ForegroundColor Cyan
& py -3.12 -m venv .venv

# 4. Activate
Write-Host "Activating venv ..." -ForegroundColor Cyan
& .\.venv\Scripts\Activate.ps1

# 5. Upgrade pip
Write-Host "Upgrading pip ..." -ForegroundColor Cyan
& python -m pip install --upgrade pip wheel setuptools

# 6. Install dependencies
Write-Host "Installing dependencies (this takes 3-5 minutes) ..." -ForegroundColor Cyan
& pip install -r requirements.txt

# 7. Done
Write-Host ""
Write-Host "Done! To run the app:" -ForegroundColor Green
Write-Host "   .\.venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "   streamlit run app.py" -ForegroundColor White
Write-Host ""
Write-Host "Next: authenticate Earth Engine (sekali saja):" -ForegroundColor Yellow
Write-Host "   earthengine authenticate" -ForegroundColor White
