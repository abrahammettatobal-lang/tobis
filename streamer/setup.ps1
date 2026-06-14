# =========================================================
# SCRIPT DE POWERSHELL PARA EL MUNDIAL 2026 - TOBIS
# =========================================================

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "--- CONFIGURANDO ENTORNO ---" -ForegroundColor Cyan
if (!(Test-Path "package.json")) { npm init -y | Out-Null }
npm pkg set type="module" | Out-Null

Write-Host "Instalando dependencias (15-30 seg)..." -ForegroundColor Yellow
npm install torrent-search-api webtorrent@2.4.3 inquirer open cors express --silent

Write-Host "Listo. Comandos:" -ForegroundColor Green
Write-Host "  npm run cli    -> menu interactivo (terminal)" -ForegroundColor White
Write-Host "  npm start      -> API + reproductor para la web" -ForegroundColor White
