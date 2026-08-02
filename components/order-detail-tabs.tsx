"use client";

import { useState } from "react";

type Tab = {
  key: string;
  label: string;
  badge?: number;
  content: React.ReactNode;
};

// Pestañas del detalle del pedido (cliente): Seguimiento · Chat · Detalles.
// Solo se monta el contenido de la pestaña activa, así el chat (que carga
// mensajes) solo trabaja cuando lo abres.
export function OrderDetailTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-muted/40 p-1">
        {tabs.map((t) => {
          const on = t.key === current?.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={
                "relative rounded-xl py-2 text-sm font-semibold transition active:scale-[0.98] " +
                (on
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground")
              }
            >
              {t.label}
              {t.badge ? (
                <span className="absolute -top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
