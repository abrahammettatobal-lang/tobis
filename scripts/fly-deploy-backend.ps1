# Tobis — despliegue backend en Fly.io (usa ruta completa de flyctl)
$ErrorActionPreference = "Stop"
$Fly = Join-Path $env:USERPROFILE ".fly\bin\flyctl.exe"

if (-not (Test-Path $Fly)) {
  Write-Host "flyctl no encontrado. Instala: iwr https://fly.io/install.ps1 -useb | iex" -ForegroundColor Red
  exit 1
}

$BackendRoot = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\backend"
$EnvFile = Join-Path $BackendRoot ".env"

if (-not (Test-Path $EnvFile)) {
  Write-Host "Falta backend/.env" -ForegroundColor Red
  exit 1
}

function Read-EnvValue($name) {
  foreach ($line in Get-Content $EnvFile) {
    if ($line -match "^\s*$name=(.+)$") {
      return $Matches[1].Trim()
    }
  }
  return $null
}

$rapid = Read-EnvValue "RAPIDAPI_KEY"
$sports = Read-EnvValue "SPORTSAPI_KEY"
$gemini = Read-EnvValue "GEMINI_API_KEY"
$frontend = "https://tobis-two.vercel.app"

Push-Location $BackendRoot

Write-Host "=== fly launch (tobis-backend, region dfw) ===" -ForegroundColor Cyan
$ErrorActionPreference = "Continue"

$apps = & $Fly apps list --json 2>$null | ConvertFrom-Json
$exists = $apps | Where-Object { $_.Name -eq "tobis-backend" }

if (-not $exists) {
  & $Fly launch --name tobis-backend -r dfw --yes --no-deploy
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Fly.io requiere tarjeta activa. Agrega pago en:" -ForegroundColor Yellow
    Write-Host "  https://fly.io/dashboard/personal/billing" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Luego repite este script." -ForegroundColor Yellow
    Pop-Location
    exit 1
  }
} else {
  Write-Host "App tobis-backend ya existe, saltando launch." -ForegroundColor DarkGray
}

Write-Host "=== fly secrets ===" -ForegroundColor Cyan
& $Fly secrets set -a tobis-backend `
  "RAPIDAPI_KEY=$rapid" `
  "SPORTSAPI_KEY=$sports" `
  "GEMINI_API_KEY=$gemini" `
  "FRONTEND_URL=$frontend" `
  "LIVESCORE_LOCALE=en" `
  "SCRAPE_INTERVAL_MS=60000"

Write-Host "=== fly deploy ===" -ForegroundColor Cyan
& $Fly deploy -a tobis-backend --primary-region dfw -y

Pop-Location
Write-Host ""
Write-Host "Backend: https://tobis-backend.fly.dev/api/health" -ForegroundColor Green
