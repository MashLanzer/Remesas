"use client";

import { useMemo, useState, useTransition } from "react";
import { Route, Check, MapPin, ChevronRight } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { updateRemittanceStatus } from "@/app/actions";
import { usd, cn } from "@/lib/utils";
import type { Remittance } from "@/lib/types";

// Modo ruta: checklist del día para ir marcando entregas hechas, en orden por
// provincia. Optimista: al marcar, se tacha y se registra la entrega.
export function RouteChecklist({ pending }: { pending: Remittance[] }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [, start] = useTransition();

  function mark(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    start(() => updateRemittanceStatus(id, "entregado"));
  }

  // Agrupar por provincia para armar la ruta.
  const groups = useMemo(() => {
    const map = new Map<string, Remittance[]>();
    for (const r of pending) {
      const key = r.beneficiary?.province || "Sin provincia";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [pending]);

  const doneCount = done.size;
  const total = pending.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-semibold text-primary transition active:scale-95"
      >
        <Route className="h-3.5 w-3.5" /> Modo ruta
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Ruta del día">
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-primary/5 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            {doneCount} de {total} entregadas
          </span>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="space-y-4 pb-4">
          {groups.map(([province, stops]) => (
            <div key={province}>
              <p className="mb-1.5 flex items-center gap-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-3 w-3" /> {province}
              </p>
              <div className="space-y-2">
                {stops.map((r) => {
                  const isDone = done.has(r.id);
                  const mapQuery = [
                    r.beneficiary?.address,
                    r.beneficiary?.province,
                    "Cuba",
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3 transition",
                        isDone
                          ? "border-income/20 bg-income/5 opacity-60"
                          : "border-border bg-card"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => !isDone && mark(r.id)}
                        aria-label="Marcar entregada"
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90",
                          isDone
                            ? "border-income bg-income text-white"
                            : "border-border text-transparent"
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-semibold text-foreground",
                            isDone && "line-through"
                          )}
                        >
                          {r.beneficiary?.name || r.client?.name || "Remesa"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.beneficiary?.address || "Sin dirección"} ·{" "}
                          {usd(r.amount_usd)}
                        </p>
                      </div>
                      {(r.beneficiary?.address || r.beneficiary?.province) && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            mapQuery
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Abrir en mapa"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info/10 text-info transition active:scale-90"
                        >
                          <MapPin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </>
  );
}
