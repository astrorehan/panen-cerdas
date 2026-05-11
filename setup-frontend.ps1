# PanenCerdas - frontend setup (Windows PowerShell)
# Run: .\setup-frontend.ps1
# Prereq: Node.js 20+ installed (node --version)

$ErrorActionPreference = "Stop"

Write-Host "PanenCerdas frontend setup" -ForegroundColor Green

try {
    $nodeVersion = node --version
    Write-Host "OK Node $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found. Install LTS 20+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Set-Location frontend

if (-not (Test-Path .env.local)) {
    Copy-Item .env.local.example .env.local
    Write-Host "Created .env.local from example" -ForegroundColor Yellow
}

Write-Host "Installing npm deps (2-3 min) ..." -ForegroundColor Cyan
& npm install

Set-Location ..

Write-Host ""
Write-Host "Frontend ready. Start it with:" -ForegroundColor Green
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then visit http://localhost:3000 (backend must run on :8000 first)" -ForegroundColor Yellow
