# Giro — Landing 3D cinematográfica

Experiencia de producto tipo Awwwards: un smartphone 3D flota en el espacio y
rota / se acerca / cambia de pantalla **ligado 100% al scroll**, con partículas
reactivas, luces dinámicas, bloom sutil y parallax de ratón.

Proyecto **independiente** de la app (Vite + React). Se despliega aparte.

## Stack
- **Vite + React + TypeScript**
- **Three.js + React Three Fiber + Drei** (3D)
- **@react-three/postprocessing** (bloom / vignette, solo gama alta)
- **GSAP + ScrollTrigger** (`scrub: true`) — sincronía scroll↔3D
- **Lenis** — scroll suave
- **Tailwind CSS** — UI

## Correr en local
```bash
cd landing-3d
npm install
npm run dev
```
Abre la URL que muestra Vite (normalmente http://localhost:5173).

## Build de producción
```bash
npm run build      # genera /dist
npm run preview    # previsualiza el build
```

## Desplegar (aparte de la app)
- **Vercel:** nuevo proyecto → Root Directory `landing-3d` → framework **Vite**
  (build `npm run build`, output `dist`).
- **Cloudflare Pages / Netlify:** build command `npm run build`, output `dist`,
  base `landing-3d`.

## Configurar enlaces
En `src/ui/Overlay.tsx`, arriba, edita:
- `ANDROID_APK_URL` — descarga del APK (release de GitHub o hosting público).
- `WEB_APP_URL` — URL de tu app real.

## Cómo funciona el scroll → 3D
- `src/scroll/store.ts` define **keyframes** por tramo (hero, secciones, final):
  posición de cámara, rotación/posición del teléfono, pantalla activa e
  intensidad de luz. `sample(p)` interpola entre ellos con easing.
- `src/scroll/useSmoothScroll.ts` monta **Lenis** + un **ScrollTrigger** con
  `scrub:true` que escribe `scroll.progress` (0→1) y arma los reveals de texto.
- `src/three/Experience.tsx` lee ese progreso en `useFrame` y mueve cámara y
  luces (con lerp para el efecto "scrub" mantecoso). El ratón añade parallax.
- `src/three/Phone.tsx` rota/posiciona el teléfono y cambia la textura de
  pantalla según la sección; chips de UI flotan en la sección 3.
- `src/three/Particles.tsx` — campo de partículas que gira y se expande con el
  scroll.

## Ajustar el guion cinematográfico
Todo el "storyboard" vive en `KEYFRAMES` (`src/scroll/store.ts`). Cambia ahí los
ángulos, zooms y en qué scroll aparece cada pantalla. Añade/quita secciones
ajustando `SECTIONS` y las `<Section>` en `Overlay.tsx` (deben coincidir).

## Reemplazar por tu modelo 3D real (.glb)
Las pantallas se dibujan en canvas (`src/three/screens.ts`) — sin assets. Para
un modelo real:
1. Pon `phone.glb` en `public/`.
2. En `src/three/Phone.tsx` usa `useGLTF("/phone.glb")` y renderiza
   `<primitive object={scene} />` en vez del cuerpo con primitivas (hay un
   comentario con el ejemplo). Mantén ligero el modelo (Draco/meshopt).

## Rendimiento / móvil
`src/App.tsx` detecta gama baja (móvil, pocos núcleos, `prefers-reduced-motion`)
y baja `dpr`, reduce partículas y **apaga el postprocessing**. Respeta también
la preferencia de menos movimiento.
