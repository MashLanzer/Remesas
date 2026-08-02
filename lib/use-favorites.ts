"use client";

import { useCallback, useEffect, useState } from "react";

// Favoritos del cliente (paquetes / ofertas). Se guardan en el propio
// dispositivo con localStorage: no requieren cuenta ni migración, y funcionan
// al instante. Cada "namespace" (p. ej. "packages" u "offers") tiene su lista.
// Al alternar uno, se avisa a las demás pestañas/instancias con un evento para
// que todo se mantenga en sincronía.

const EVENT = "giro:favorites";

function keyFor(namespace: string): string {
  return `giro:fav:${namespace}`;
}

function read(namespace: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(keyFor(namespace));
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export function useFavorites(namespace: string) {
  const [favs, setFavs] = useState<Set<string>>(() => new Set());

  // Cargar tras el montaje (evita desajuste de hidratación cliente/servidor).
  useEffect(() => {
    setFavs(read(namespace));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { namespace?: string } | undefined;
      if (!detail || detail.namespace === namespace) setFavs(read(namespace));
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [namespace]);

  const toggle = useCallback(
    (id: string) => {
      const next = read(namespace);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(
          keyFor(namespace),
          JSON.stringify(Array.from(next))
        );
      } catch {
        /* almacenamiento lleno o bloqueado: se ignora */
      }
      setFavs(new Set(next));
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { namespace } }));
    },
    [namespace]
  );

  const isFav = useCallback((id: string) => favs.has(id), [favs]);

  return { favs, isFav, toggle };
}
