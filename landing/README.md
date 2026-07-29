# Giro — Landing (sitio de presentación y descarga)

Sitio **estático e independiente** de la app. Es un solo archivo `index.html`
(sin build, sin dependencias). Vive en este repo pero se **despliega aparte**,
así que nunca afecta a la app.

## Qué configurar (una vez)

Abre `index.html` y edita el bloque **`CONFIGURA AQUÍ`** al final:

- `ANDROID_APK_URL` → enlace directo al APK. Por defecto apunta al último
  release de GitHub:
  `https://github.com/MashLanzer/Remesas/releases/latest/download/Giro.apk`
  - ⚠️ Ese enlace solo funciona para descargas anónimas si el **release es
    público**. Si tu repo es privado, sube `Giro.apk` a otro hosting (o haz el
    release público) y pon esa URL aquí.
- `WEB_APP_URL` → la URL donde está desplegada tu app real
  (ej. `https://app.giroapp.com` o tu URL de Vercel).

## Cómo desplegarlo (elige uno)

Es 100% estático: **no lleva comando de build**, solo servir la carpeta.

### Opción A — Vercel (proyecto separado)
1. En Vercel → **Add New Project** → importa este mismo repo.
2. En **Root Directory** elige `landing`.
3. **Framework Preset:** `Other`. **Build Command:** vacío.
   **Output Directory:** vacío (o `.`).
4. Deploy. Conecta tu dominio (ej. `giroapp.com`).

### Opción B — Cloudflare Pages
1. Pages → conecta el repo.
2. **Build command:** vacío. **Build output directory:** `landing`.
3. Deploy + dominio.

### Opción C — Netlify
1. Nuevo sitio desde el repo.
2. **Base directory:** `landing`. **Build command:** vacío.
   **Publish directory:** `landing`.

## Dominios sugeridos
- `giroapp.com` → este landing.
- `app.giroapp.com` → la app (tu deploy actual de Vercel).

## iPhone (iOS)
iOS no permite instalar un archivo suelto como el APK. El landing muestra los
pasos para instalar la **PWA** desde Safari ("Añadir a pantalla de inicio").
Cuando quieras la vía oficial (TestFlight / App Store), se prepara aparte.
