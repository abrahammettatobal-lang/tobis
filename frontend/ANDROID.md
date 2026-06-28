# Tobis — APK Android (sin Android Studio)

## Opción 1: GitHub Actions (recomendada)

No instalas Android Studio ni el SDK. GitHub compila el APK en la nube.

1. Sube el repo a GitHub (si aún no está).
2. Ve a **Actions → Build Android APK → Run workflow**.
3. Cuando termine (~5 min), abre el run y descarga **tobis-debug-apk**.
4. Pasa `app-debug.apk` al teléfono e instálalo (permite *Origen desconocido*).

También se dispara solo al hacer push a `main` con cambios en `frontend/`.

Desde terminal (con [GitHub CLI](https://cli.github.com/) instalado):

```powershell
gh workflow run android-apk.yml
gh run watch
gh run download -n tobis-debug-apk
```

---

## Opción 2: Gradle en tu PC (sin abrir Android Studio)

Requisitos: **JDK 21** (Capacitor 7) y **Android SDK** (command-line tools, no el IDE).

> Si tienes JDK 17 y 21 instalados, el script usa JDK 21 automáticamente.  
> Error `invalid source release: 21` = tu `JAVA_HOME` apunta a JDK 17.

```powershell
cd frontend
npm install
npm run apk:build
```

El script busca `ANDROID_HOME`. Si no existe, muestra instrucciones.

SDK mínimo (una vez):

1. [Command-line tools](https://developer.android.com/studio#command-line-tools-only) → extrae en  
   `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest`
2. En PowerShell:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" `
  "platform-tools" "platforms;android-35" "build-tools;35.0.0"
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
```

APK generado:

```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Opción 3: PWA (sin APK)

En el móvil, con la web en HTTPS (Vercel):

Chrome → menú → **Instalar app** / **Añadir a pantalla de inicio**.

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run build:app` | Build web + `cap sync` |
| `npm run apk:build` | APK local con Gradle (sin Android Studio) |
| `npm run apk:github` | Lanza el workflow en GitHub |

## Notas

- `appId`: `com.tobis.mundial`
- Marcadores vía openfootball (internet obligatorio)
- Reproductor en vivo: `/en-vivo.html` (iframe sin sandbox para anuncios/señal)
