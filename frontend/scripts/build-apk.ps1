# Build APK sin Android Studio (solo JDK + Android SDK en PATH)
$ErrorActionPreference = "Stop"
$FrontendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$AndroidRoot = Join-Path $FrontendRoot "android"
$Gradlew = Join-Path $AndroidRoot "gradlew.bat"
$ApkOut = Join-Path $AndroidRoot "app\build\outputs\apk\debug\app-debug.apk"

function Find-AndroidSdk {
  if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
    return $env:ANDROID_HOME
  }
  if ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) {
    return $env:ANDROID_SDK_ROOT
  }
  $candidates = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    (Join-Path $FrontendRoot ".android-sdk")
  )
  foreach ($path in $candidates) {
    if (Test-Path (Join-Path $path "platform-tools")) {
      return $path
    }
  }
  return $null
}

function Resolve-Jdk21 {
  $roots = @(
    "C:\Program Files\Eclipse Adoptium",
    "C:\Program Files\Java",
    "$env:LOCALAPPDATA\Programs\Eclipse Adoptium"
  )

  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    $match = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^jdk-21' } |
      Sort-Object Name -Descending |
      Select-Object -First 1
    if ($match -and (Test-Path (Join-Path $match.FullName "bin\java.exe"))) {
      return $match.FullName
    }
  }

  if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $verLine = & "$env:JAVA_HOME\bin\java.exe" -version 2>&1 | Select-Object -First 1
    if ($verLine -match 'version "21') { return $env:JAVA_HOME }
  }

  return $null
}

function Ensure-Jdk21 {
  $jdk21 = Resolve-Jdk21
  if (-not $jdk21) {
    Write-Host "Capacitor 7 requiere JDK 21 (tu JAVA_HOME apunta a JDK 17)." -ForegroundColor Red
    Write-Host "Instala: winget install EclipseAdoptium.Temurin.21.JDK" -ForegroundColor Yellow
    Write-Host "Luego ejecuta de nuevo: npm run apk:build" -ForegroundColor Yellow
    exit 1
  }

  $env:JAVA_HOME = $jdk21
  $env:PATH = "$jdk21\bin;$env:PATH"
  Write-Host "JAVA_HOME = $jdk21" -ForegroundColor DarkGray
}

$sdk = Find-AndroidSdk
if (-not $sdk) {
  Write-Host ""
  Write-Host "No hay Android SDK en este PC." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Opcion A (recomendada, sin instalar nada):" -ForegroundColor Cyan
  Write-Host "  1. Sube el repo a GitHub"
  Write-Host "  2. Actions -> Build Android APK -> Run workflow"
  Write-Host "  3. Descarga el artifact tobis-debug-apk"
  Write-Host ""
  Write-Host "Opcion B (solo linea de comandos, ~200 MB una vez):" -ForegroundColor Cyan
  Write-Host "  winget install Google.AndroidSDK.PlatformTools"
  Write-Host "  Descarga Command-line Tools: https://developer.android.com/studio#command-line-tools-only"
  Write-Host "  Extrae en %LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest"
  Write-Host "  sdkmanager platform-tools platforms;android-35 build-tools;35.0.0"
  Write-Host "  setx ANDROID_HOME %LOCALAPPDATA%\Android\Sdk"
  Write-Host ""
  Write-Host "Opcion C: PWA en Chrome -> Instalar app (sin APK)" -ForegroundColor Cyan
  exit 1
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
Write-Host "ANDROID_HOME = $sdk" -ForegroundColor DarkGray

Ensure-Jdk21

Push-Location $FrontendRoot
Write-Host "=== npm run build:app ===" -ForegroundColor Cyan
npm run build:app
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }

Write-Host "=== npm run cap:assets ===" -ForegroundColor Cyan
npm run cap:assets
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

if (-not (Test-Path $Gradlew)) {
  Write-Host "Falta proyecto Android. Ejecuta: npm run cap:add:android" -ForegroundColor Red
  exit 1
}

Push-Location $AndroidRoot
Write-Host "=== gradlew assembleDebug ===" -ForegroundColor Cyan
& .\gradlew.bat assembleDebug --no-daemon -q
$code = $LASTEXITCODE
Pop-Location

if ($code -ne 0) {
  Write-Host "Gradle fallo (codigo $code)" -ForegroundColor Red
  exit $code
}

if (Test-Path $ApkOut) {
  Write-Host ""
  Write-Host "APK listo:" -ForegroundColor Green
  Write-Host "  $ApkOut"
  Write-Host ""
  Write-Host "Copialo al telefono e instalalo (activa Origen desconocido)." -ForegroundColor DarkGray
} else {
  Write-Host "Build termino pero no encontre el APK en $ApkOut" -ForegroundColor Red
  exit 1
}
