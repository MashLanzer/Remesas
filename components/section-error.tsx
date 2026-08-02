"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, AlertTriangle, Home } from "lucide-react";

// Error boundary contextual para una sección (cliente o panel). A diferencia
// de la página de error global, se renderiza DENTRO del armazón (barra de
// navegación incluida), así un fallo en una pantalla no tumba toda la app.
export function SectionError({
  reset,
  error,
  homeHref = "/",
  title = "No pudimos cargar esta pantalla",
  description = "Hubo un problema al mostrar esta parte. Reintenta; si sigue pasando, vuelve al inicio.",
}: {
  reset: () => void;
  error?: Error & { digest?: string };
  homeHref?: string;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    if (error) console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-warning/10 text-warning">
        <AlertTriangle className="h-8 w-8" />
      </span>
      <h1 className="mt-6 text-xl font-extrabold text-foreground">{title}</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" /> Reintentar
        </button>
        <Link
          href={homeHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-bold text-foreground transition active:scale-[0.98]"
        >
          <Home className="h-4 w-4" /> Inicio
        </Link>
      </div>
    </div>
  );
}
