"use client";

import { useTransition } from "react";
import { Navigation, X } from "lucide-react";
import { setRemittanceEnRoute } from "@/app/actions";

// Toggle "En camino" para el repartidor en una remesa pendiente.
export function EnRouteToggle({
  id,
  enRoute,
}: {
  id: string;
  enRoute: boolean;
}) {
  const [pending, start] = useTransition();

  if (enRoute) {
    return (
      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-info/25 bg-info/5 p-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
          <Navigation className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">En camino</p>
          <p className="text-xs text-muted-foreground">
            Vas a entregar esta remesa.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => setRemittanceEnRoute(id, false))}
          aria-label="Cancelar en camino"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-90 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setRemittanceEnRoute(id, true))}
      className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-info/30 bg-info/5 px-4 py-3 text-sm font-semibold text-info transition active:scale-[0.98] disabled:opacity-50"
    >
      <Navigation className="h-4 w-4" /> Salí a entregar
    </button>
  );
}
