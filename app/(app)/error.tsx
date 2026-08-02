"use client";

import { SectionError } from "@/components/section-error";

// Fallo dentro del panel del negocio: se muestra dentro del armazón (con la
// barra de navegación) para no perder el contexto.
export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionError error={error} reset={reset} homeHref="/" />;
}
