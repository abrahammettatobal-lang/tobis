# Tobis — despliegue en Fly.io (backend + streamer)
# Requisito: https://fly.io/docs/hands-on/install-flyctl/  →  fly auth login

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== Tobis · Fly.io ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
  Write-Host "Instala flyctl: https://fly.io/docs/hands-on/install-flyctl/" -ForegroundColor Yellow
  exit 1
}

Write-Host "1) Backend (tobis-backend)" -ForegroundColor Green
Write-Host "   cd backend"
Write-Host "   fly launch --name tobis-backend --region dfw --copy-config --no-deploy"
Write-Host "   fly secrets set RAPIDAPI_KEY=xxx SPORTSAPI_KEY=xxx GEMINI_API_KEY=xxx FRONTEND_URL=https://tobis-two.vercel.app LIVESCORE_LOCALE=en"
Write-Host "   fly deploy"
Write-Host ""

Write-Host "2) Streamer (tobis-streamer, 1 GB RAM)" -ForegroundColor Green
Write-Host "   cd streamer"
Write-Host "   fly launch --name tobis-streamer --region dfw --copy-config --no-deploy"
Write-Host "   fly secrets set FRONTEND_URL=https://tobis-two.vercel.app"
Write-Host "   fly deploy"
Write-Host ""

Write-Host "3) Vercel (frontend) — Environment Variables:" -ForegroundColor Green
Write-Host "   VITE_API_URL=https://tobis-backend.fly.dev"
Write-Host "   VITE_STREAMER_API=https://tobis-streamer.fly.dev"
Write-Host ""

$deployBackend = Read-Host "Desplegar backend ahora? (s/N)"
if ($deployBackend -eq 's') {
  Push-Location (Join-Path $Root "backend")
  fly deploy
  Pop-Location
}

$deployStreamer = Read-Host "Desplegar streamer ahora? (s/N)"
if ($deployStreamer -eq 's') {
  Push-Location (Join-Path $Root "streamer")
  fly deploy
  Pop-Location
}

Write-Host "Listo. Prueba: fly open -a tobis-backend  (health en /api/health)" -ForegroundColor Cyan
