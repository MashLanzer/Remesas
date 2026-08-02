"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { LiveMap } from "@/components/live-map";

// Botón "Ver en el mapa" que abre el seguimiento en una hoja. Así el mapa no
// ocupa espacio en la pestaña salvo que lo pidas (y solo se monta al abrir).
export function OrderMapButton({
  remittanceId,
  province,
  address,
  live,
  title,
  label,
  sublabelLive,
  sublabelStatic,
}: {
  remittanceId: string | null | undefined;
  province: string | null | undefined;
  address: string | null | undefined;
  live: boolean;
  title: string;
  label: string;
  sublabelLive: string;
  sublabelStatic: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">{label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {live ? sublabelLive : sublabelStatic}
          </span>
        </span>
        {live && (
          <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary">
            <span className="h-full w-full animate-ping rounded-full bg-primary/70" />
          </span>
        )}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <LiveMap
          remittanceId={remittanceId ?? null}
          province={province ?? null}
          address={address ?? null}
          live={live}
        />
      </Sheet>
    </>
  );
}
