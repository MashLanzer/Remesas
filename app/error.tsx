"use client";

import { useEffect } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Se registra en consola para depurar; no se muestra el detalle al usuario.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-warning/10 text-warning">
        <AlertTriangle className="h-8 w-8" />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-foreground">
        Algo salió mal
      </h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Tuvimos un problema al cargar esta parte. Puedes reintentar; si sigue
        pasando, vuelve a entrar más tarde.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.98]"
      >
        <RotateCcw className="h-4 w-4" /> Reintentar
      </button>
    </main>
  );
}
