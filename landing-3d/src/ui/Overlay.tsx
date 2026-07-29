// Contenido que scrollea SOBRE el 3D fijo. Cada <section> ocupa una pantalla.
// El contenedor deja pasar el puntero al canvas (pointer-events-none) salvo en
// los elementos interactivos (botones), que lo re-activan.

// ==== EDITA AQUÍ TUS ENLACES ====
const ANDROID_APK_URL =
  "https://github.com/MashLanzer/Remesas/releases/latest/download/Giro.apk";
const WEB_APP_URL = "https://remesas-nu.vercel.app";
// ================================

function Btn({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        "pointer-events-auto inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-[15px] font-bold transition active:scale-95 " +
        (variant === "primary"
          ? "bg-brand text-[#04140d] shadow-[0_12px_40px_-10px_rgba(18,184,102,.6)] hover:brightness-110"
          : "border border-white/15 text-white hover:bg-white/5")
      }
    >
      {children}
    </a>
  );
}

function Section({
  align = "left",
  children,
}: {
  align?: "left" | "right" | "center";
  children: React.ReactNode;
}) {
  const pos =
    align === "right"
      ? "items-end text-right"
      : align === "center"
        ? "items-center text-center"
        : "items-start text-left";
  return (
    <section className="pointer-events-none flex h-screen w-full items-center">
      <div className="mx-auto flex w-full max-w-6xl px-6 sm:px-10">
        <div className={"flex w-full flex-col " + pos}>
          <div className="max-w-xl">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function Overlay() {
  return (
    <div id="page" className="relative z-10">
      {/* Nav */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-center">
        <div className="mt-4 flex w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-light to-brand">
              <svg width="16" height="16" viewBox="0 0 512 512">
                <path d="M96 372l320-137L96 140v107l228 30-228 30z" fill="#04140d" />
              </svg>
            </span>
            Giro
          </div>
          <Btn href="#final" variant="ghost">
            Descargar
          </Btn>
        </div>
      </div>

      {/* 1 — HERO */}
      <Section align="left">
        <span className="reveal inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/80 backdrop-blur">
          ✈️ Envíos a Cuba
        </span>
        <h1
          data-hero-title
          className="mt-5 text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl"
        >
          Envía a Cuba <span className="text-grad">como nunca</span>
        </h1>
        <p className="reveal mt-6 text-lg text-white/70">
          Rápido, seguro y con seguimiento en vivo hasta tu familia. Una
          experiencia que se siente del futuro.
        </p>
        <div className="reveal mt-8 flex flex-wrap gap-3">
          <Btn href="#final">Descargar la app</Btn>
          <Btn href={WEB_APP_URL} variant="ghost">
            Abrir app web
          </Btn>
        </div>
        <div className="reveal mt-16 text-sm text-white/40">
          Desplázate ↓
        </div>
      </Section>

      {/* 2 */}
      <Section align="right">
        <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand-light">
          Velocidad
        </p>
        <h2 className="reveal mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">
          Rápido de verdad
        </h2>
        <p className="reveal mt-5 text-lg text-white/70">
          Eliges monto y beneficiario, y listo. Sin filas, sin llamadas, sin
          complicaciones. Tu envío empieza al instante.
        </p>
      </Section>

      {/* 3 */}
      <Section align="left">
        <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand-light">
          Confianza
        </p>
        <h2 className="reveal mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">
          Seguro, con prueba
          <br />
          de cada entrega
        </h2>
        <p className="reveal mt-5 text-lg text-white/70">
          Foto, firma y confirmación de quien recibe. Sabes exactamente cuándo y
          a quién llegó tu dinero.
        </p>
      </Section>

      {/* 4 */}
      <Section align="center">
        <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand-light">
          Recompensas
        </p>
        <h2 className="reveal mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">
          Gana puntos en
          <br />
          cada envío
        </h2>
        <p className="reveal mt-5 text-lg text-white/70">
          Acumula puntos con cada remesa y canjéalos por descuentos. Mientras más
          cuidas a tu familia, más ganas.
        </p>
      </Section>

      {/* 5 — FINAL / CTA */}
      <section
        id="final"
        className="pointer-events-none flex h-screen w-full items-center justify-center"
      >
        <div className="max-w-2xl px-6 text-center">
          <h2 className="reveal text-5xl font-extrabold tracking-tight sm:text-7xl">
            Descarga <span className="text-grad">Giro</span>
          </h2>
          <p className="reveal mt-5 text-lg text-white/70">
            Disponible para Android e iPhone. Gratis.
          </p>
          <div className="reveal mt-8 flex flex-wrap justify-center gap-3">
            <Btn href={ANDROID_APK_URL}>Descargar para Android</Btn>
            <Btn href={WEB_APP_URL} variant="ghost">
              Instalar en iPhone
            </Btn>
          </div>
          <p className="reveal mt-10 text-xs text-white/40">
            © {new Date().getFullYear()} Giro · Tus envíos a Cuba, siempre a mano
          </p>
        </div>
      </section>
    </div>
  );
}
