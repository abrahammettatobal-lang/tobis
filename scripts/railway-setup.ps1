# Tobis — despliegue backend + streamer en Railway
# Requisitos: cuenta en https://railway.app y Railway CLI
#   npm i -g @railway/cli
#   railway login

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "`n=== TOBIS · Railway ===" -ForegroundColor Cyan
Write-Host "Despliega 2 servicios desde este monorepo.`n"

if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
  Write-Host "Instala Railway CLI:" -ForegroundColor Yellow
  Write-Host "  npm install -g @railway/cli" -ForegroundColor White
  Write-Host "  railway login`n"
  exit 1
}

$frontendUrl = Read-Host "URL del frontend en Vercel (ej. https://tobis-two.vercel.app)"
if (-not $frontendUrl) { $frontendUrl = "https://tobis-two.vercel.app" }

Write-Host "`n--- 1/2 Backend ---" -ForegroundColor Green
Set-Location (Join-Path $Root "backend")
railway link
railway variables set "FRONTEND_URL=http://localhost:5173,$frontendUrl"
$sportsKey = Read-Host "SPORTSAPI_KEY (Enter para omitir)"
if ($sportsKey) { railway variables set "SPORTSAPI_KEY=$sportsKey" }
railway variables set "LIVESCORE_LOCALE=en"
railway up --detach
$backendUrl = railway domain 2>$null
if (-not $backendUrl) {
  Write-Host "Genera dominio: railway domain" -ForegroundColor Yellow
} else {
  Write-Host "Backend: https://$backendUrl" -ForegroundColor Cyan
}

Write-Host "`n--- 2/2 Streamer ---" -ForegroundColor Green
Write-Host "Crea un SEGUNDO servicio en Railway (Root: streamer) antes de enlazar." -ForegroundColor Yellow
Set-Location (Join-Path $Root "streamer")
$descargas = Join-Path (Get-Location) "descargas"
if (Test-Path $descargas) {
  $sizeGb = [math]::Round((Get-ChildItem $descargas -Recurse -File -EA SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB, 2)
  if ($sizeGb -gt 0.1) {
    Write-Host "descargas/ pesa ${sizeGb} GB — no se sube (.railwayignore). OK para deploy." -ForegroundColor DarkYellow
  }
}
railway link
railway variables set "FRONTEND_URL=http://localhost:5173,$frontendUrl"
railway up --detach
$streamerUrl = railway domain 2>$null
if (-not $streamerUrl) {
  Write-Host "Genera dominio: railway domain" -ForegroundColor Yellow
} else {
  Write-Host "Streamer: https://$streamerUrl" -ForegroundColor Cyan
}

Write-Host "`n--- Variables en Vercel (frontend) ---" -ForegroundColor Green
if ($backendUrl) {
  Write-Host "VITE_API_URL=https://$backendUrl"
}
if ($streamerUrl) {
  Write-Host "VITE_STREAMER_API=https://$streamerUrl"
}
Write-Host "`nLuego: cd frontend; npx vercel --prod`n"

Set-Location $Root
