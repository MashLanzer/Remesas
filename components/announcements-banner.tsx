"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import type { Announcement } from "@/lib/types";

const DEFAULT_KEY = "giro_c_dismissed_ann";

// Muestra los anuncios activos del negocio. Cada uno se puede descartar (se
// recuerda por id en el dispositivo). `storageKey` separa los descartes por
// contexto (cliente vs personal).
export function AnnouncementsBanner({
  items,
  storageKey = DEFAULT_KEY,
}: {
  items: Announcement[];
  storageKey?: string;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDismissed(JSON.parse(raw));
    } catch {
      /* nada */
    }
    setReady(true);
  }, []);

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next.slice(-50)));
    } catch {
      /* nada */
    }
  }

  if (!ready) return null;
  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((a) =>
        a.image_url ? (
          // Con foto: imagen arriba + texto debajo.
          <div
            key={a.id}
            className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5"
          >
            <button
              type="button"
              onClick={() => dismiss(a.id)}
              aria-label="Descartar"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.image_url}
              alt={a.title}
              className="h-40 w-full object-cover"
            />
            <div className="p-4">
              <p className="text-sm font-bold text-foreground">{a.title}</p>
              {a.body && (
                <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">
                  {a.body}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div
            key={a.id}
            className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg text-primary">
              {a.emoji || <Megaphone className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{a.title}</p>
              {a.body && (
                <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">
                  {a.body}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(a.id)}
              aria-label="Descartar"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      )}
    </div>
  );
}
