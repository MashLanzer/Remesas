"use client";

import { SectionError } from "@/components/section-error";

// Fallo dentro del área de cliente: se muestra dentro del armazón (con la
// barra de navegación) para no perder el contexto.
export default function ClienteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionError error={error} reset={reset} homeHref="/c" />;
}
