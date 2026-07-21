"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";

/**
 * Imagen que respeta el "Ahorro de datos": si está activo, no descarga la
 * foto hasta que el usuario la toca. En uso normal se carga sola.
 */
export function SmartImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    const saver = document.documentElement.classList.contains("data-saver");
    setShow(!saver); // en uso normal, cargar sola
    setDecided(true);
  }, []);

  if (show) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className={className} />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShow(true)}
      disabled={!decided}
      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition active:scale-[0.99]"
    >
      <ImageIcon className="h-6 w-6 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">Cargar imagen</span>
      <span className="text-xs text-muted-foreground">
        Ahorro de datos activo · toca para ver la foto
      </span>
    </button>
  );
}
