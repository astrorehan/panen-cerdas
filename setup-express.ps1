# PanenCerdas - Express gateway setup (Windows PowerShell)
# Run: .\setup-express.ps1
# Prereq: Node.js 20+ installed (node --version)

$ErrorActionPreference = "Stop"

Write-Host "PanenCerdas Express gateway setup" -ForegroundColor Green

try {
    $nodeVersion = node --version
    Write-Host "OK Node $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found. Install LTS 20+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Set-Location backend-express

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env from example (PORT=4200)" -ForegroundColor Yellow
}

Write-Host "Installing npm deps (~1 min) ..." -ForegroundColor Cyan
& npm install

Set-Location ..

Write-Host ""
Write-Host "Gateway ready. Start it with:" -ForegroundColor Green
Write-Host "   cd backend-express" -ForegroundColor White
Write-Host "   node index.js" -ForegroundColor White
Write-Host ""
Write-Host "Gateway listens on http://127.0.0.1:4200 and forwards /api/* to ml_service on :8000." -ForegroundColor Yellow
