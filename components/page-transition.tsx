"use client";

import { usePathname } from "next/navigation";

// Antes envolvía TODO el contenido de la página en `animate-fade-up` (opacity +
// transform). En páginas muy largas (el inicio mide varios miles de px), esa
// animación promociona el contenedor a una capa de composición más alta que el
// tamaño máximo de textura del WebView de Android, que entonces re-usa mosaicos
// y DUPLICA contenido al final del scroll ("fuga visual").
//
// Se elimina la animación del contenedor global (que era la causa) y se conserva
// solo el remontaje por ruta con `key`, que no promociona ninguna capa.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname}>{children}</div>;
}
