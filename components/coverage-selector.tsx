"use client";

import { useState, useTransition } from "react";
import { MapPin, Check } from "lucide-react";
import { Card } from "@/components/ui";
import { updateCoverage } from "@/app/actions";
import { CUBA_PROVINCES } from "@/lib/types";
import { cn } from "@/lib/utils";

// Zona de cobertura: el repartidor elige las provincias que cubre.
export function CoverageSelector({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function toggle(p: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
    setDirty(true);
    setSaved(false);
  }

  function save() {
    start(() => updateCoverage(Array.from(selected)));
    setDirty(false);
    setSaved(true);
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-foreground">Tu zona de cobertura</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Marca las provincias donde entregas. El negocio las usa para asignarte
        pedidos de tu zona.
      </p>
      <div className="flex flex-wrap gap-2">
        {CUBA_PROVINCES.map((p) => {
          const on = selected.has(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => toggle(p)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95",
                on
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground"
              )}
            >
              {p}
            </button>
          );
        })}
      </div>
      {(dirty || saved) && (
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
        >
          {saved && !dirty ? (
            <>
              <Check className="h-4 w-4" /> Guardado
            </>
          ) : (
            "Guardar cobertura"
          )}
        </button>
      )}
    </Card>
  );
}
