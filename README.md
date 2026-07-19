# Remesas

App para gestionar un negocio de remesas: registra envíos, calcula la comisión y la
ganancia, la reparte entre socios y lleva la cuenta de cuánto capital ha puesto tu
socio en Cuba. Web (Next.js) que también se empaqueta como **APK Android** con Capacitor.

## ¿Cómo funciona el negocio?

1. Un cliente en EE.UU. paga un envío + una comisión.
2. Tu socio en Cuba entrega el monto a la familia (en la moneda que elijan, a la tasa del día).
3. La ganancia (comisión + posible diferencial de cambio) se reparte entre los dos socios.
4. La app lleva el saldo: cuánto capital adelantó tu socio y cuánto le debes.

**Reglas de comisión** (automáticas, editables por remesa):
- Envío de **$100 o más** → comisión = **10 %**.
- Envío de **menos de $100** → comisión = **$5** fijos.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** (base de datos Postgres + login con Google)
- **Capacitor** (APK Android)
- **Vercel** (despliegue web)

## Puesta en marcha (local)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://app.supabase.com).
2. En **SQL Editor**, pega y ejecuta el contenido de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   Esto crea todas las tablas, las políticas de seguridad y las tasas iniciales.
3. Activa el login con Google:
   - **Authentication → Providers → Google** → habilítalo.
   - Crea un OAuth Client en [Google Cloud Console](https://console.cloud.google.com/)
     y pega el Client ID y Secret en Supabase.
   - En Google, agrega como **Authorized redirect URI**:
     `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
   - En Supabase, **Authentication → URL Configuration**, agrega tus URLs de
     redirección: `http://localhost:3000/auth/callback` y
     `https://TU-APP.vercel.app/auth/callback`.

### 3. Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Arrancar

```bash
npm run dev
```

Abre http://localhost:3000 y entra con Google.

## Desplegar en Vercel

1. Importa el repo en [vercel.com](https://vercel.com).
2. Añade las variables de entorno (las mismas de arriba, con
   `NEXT_PUBLIC_SITE_URL` apuntando a tu dominio de Vercel).
3. Deploy. Vercel detecta Next.js automáticamente.

## Generar el APK (Android)

El APK es un contenedor que carga la web desplegada (así conserva el login y el SSR).

**Opción A — GitHub Actions (recomendada):**
Ve a la pestaña **Actions → Build Android APK → Run workflow**, pon tu URL de
Vercel y descarga el APK del artefacto al terminar.

**Opción B — Local** (requiere Android Studio):

```bash
export CAP_SERVER_URL="https://TU-APP.vercel.app"
npm run build
npx cap add android
npx cap sync android
npx cap open android   # compila el APK desde Android Studio
```

## Estructura

```
app/
  (app)/            Pantallas protegidas (dashboard, remesas, agenda, socios, reportes, ajustes)
  login/            Pantalla de acceso con Google
  auth/             Callback y cierre de sesión de OAuth
  actions.ts        Server Actions (crear/editar remesas, clientes, liquidaciones…)
components/         UI reutilizable, formularios y navegación
lib/
  calc.ts           Lógica de negocio (comisión, reparto, saldo entre socios)
  data.ts           Lecturas de Supabase
  supabase/         Clientes de Supabase (navegador/servidor/middleware)
  types.ts          Tipos de datos
supabase/migrations Esquema SQL
```
