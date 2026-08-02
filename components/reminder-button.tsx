"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, Clock } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { setDeliveryReminder } from "@/app/actions";

// Programar un recordatorio de entrega (fecha/hora) para una remesa.
export function ReminderButton({
  id,
  reminderAt,
}: {
  id: string;
  reminderAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();

  const active = !!reminderAt;
  const label = reminderAt
    ? new Date(reminderAt).toLocaleString("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  function save() {
    if (!value) return;
    const iso = new Date(value).toISOString();
    start(() => setDeliveryReminder(id, iso));
    setOpen(false);
  }
  function clear() {
    start(() => setDeliveryReminder(id, null));
    setOpen(false);
  }

  // Presets rápidos.
  function preset(hoursFromNow: number) {
    const d = new Date(Date.now() + hoursFromNow * 3600000);
    start(() => setDeliveryReminder(id, d.toISOString()));
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={active && label ? `Recordatorio: ${label}` : "Recordarme entregar"}
        className={
          "flex w-full flex-col items-center justify-center gap-1 rounded-2xl border py-3 text-xs font-semibold transition active:scale-95 " +
          (active
            ? "border-primary/30 bg-primary/5 text-primary"
            : "border-border text-muted-foreground")
        }
      >
        <Bell className="h-5 w-5" />
        {active ? "Recordatorio ✓" : "Recordar"}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Recordatorio de entrega">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => preset(1)}
              className="rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground transition active:scale-95"
            >
              En 1 h
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => preset(3)}
              className="rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground transition active:scale-95"
            >
              En 3 h
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => preset(24)}
              className="rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground transition active:scale-95"
            >
              Mañana
            </button>
          </div>

          <div className="pt-1">
            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Fecha y hora exacta
            </label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
              <button
                type="button"
                disabled={pending || !value}
                onClick={save}
                className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>

          {active && (
            <button
              type="button"
              disabled={pending}
              onClick={clear}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-destructive transition active:scale-95"
            >
              <BellOff className="h-4 w-4" /> Quitar recordatorio
            </button>
          )}
          <p className="pt-1 text-[11px] text-muted-foreground">
            Se muestra en la app como aviso; no envía notificación al teléfono.
          </p>
        </div>
      </Sheet>
    </>
  );
}
