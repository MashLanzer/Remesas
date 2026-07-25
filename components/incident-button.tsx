"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { logDeliveryIncident } from "@/app/actions";

const QUICK_REASONS = [
  "No estaba en casa",
  "Teléfono apagado / no contesta",
  "Dirección incorrecta",
  "Pidió otro día/hora",
  "No pude llegar a la zona",
];

// Registrar un intento fallido de entrega (queda pendiente para reintentar).
export function IncidentButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function submit(r: string) {
    const val = r.trim();
    if (!val) return;
    start(() => logDeliveryIncident(id, val));
    setOpen(false);
    setReason("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm font-semibold text-warning transition active:scale-[0.98]"
      >
        <AlertTriangle className="h-4 w-4" /> No pude entregar
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="¿Qué pasó?"
      >
        <div className="space-y-2">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={pending}
              onClick={() => submit(r)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground transition active:scale-[0.98] disabled:opacity-50"
            >
              {r}
            </button>
          ))}
          <div className="pt-1">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Otro motivo
            </label>
            <div className="flex items-center gap-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Escribe el motivo…"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
              <button
                type="button"
                disabled={pending || !reason.trim()}
                onClick={() => submit(reason)}
                className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <X className="mt-px h-3 w-3 shrink-0" />
          La remesa sigue pendiente para reintentar. Queda registrado el motivo.
        </p>
      </Sheet>
    </>
  );
}
