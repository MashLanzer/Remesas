"use client";

import { useEffect } from "react";

// Aplica el color de marca del negocio a nivel de <html> (:root). Necesario
// para que las hojas (bottom sheets), que se renderizan por portal en <body>
// —fuera del contenedor del cliente—, también tomen el color. Restaura el valor
// anterior al desmontar (al salir del área de cliente).
export function BrandHueRoot({ hue }: { hue: number | null }) {
  useEffect(() => {
    if (hue == null) return;
    const el = document.documentElement;
    const prev = el.style.getPropertyValue("--brand-hue");
    el.style.setProperty("--brand-hue", String(hue));
    return () => {
      if (prev) el.style.setProperty("--brand-hue", prev);
      else el.style.removeProperty("--brand-hue");
    };
  }, [hue]);
  return null;
}
