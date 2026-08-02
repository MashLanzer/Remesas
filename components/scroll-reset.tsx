"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Al cambiar de pestaña/página, el contenedor de scroll del layout (que
// PERSISTE entre navegaciones) conserva su posición. En el WebView de Android
// eso, combinado con las capas promovidas, deja el header "en blanco" (parece
// que desaparece). Reiniciar el scroll arriba en cada navegación evita el
// disparador y es además el comportamiento natural (cada pestaña empieza
// arriba).
export function ScrollReset({ targetId }: { targetId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (el) {
      // Inmediato y en el siguiente frame, por si el layout aún reflowea.
      el.scrollTop = 0;
      requestAnimationFrame(() => {
        el.scrollTop = 0;
      });
    }
    // Por si el documento entero también hubiera scrolleado.
    try {
      window.scrollTo(0, 0);
    } catch {
      /* nada */
    }
  }, [pathname, targetId]);

  return null;
}
