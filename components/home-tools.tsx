"use client";

import { useState } from "react";
import { Bell, CalendarClock } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { RateAlertCard } from "@/components/rate-alert-card";
import { ReminderCard } from "@/components/reminder-card";
import { useT } from "@/components/lang-provider";
import type { ExchangeRate } from "@/lib/types";

type SendProps = {
  rates: ExchangeRate[];
  pointsBalance: number;
  redeemMin: number;
  pointValue: number;
  beneficiaries: { name: string; phone: string | null; province: string | null }[];
  transferBonusPct?: number | null;
};

// Fila compacta de "herramientas" del inicio: dos chips (Alerta de tasa y
// Recordatorio) que abren su editor completo en una hoja. Sustituye a las dos
// tarjetas grandes que ocupaban mucho scroll.
export function HomeTools({
  rates,
  sendProps,
}: {
  rates: ExchangeRate[];
  sendProps: SendProps;
}) {
  const t = useT();
  const [open, setOpen] = useState<null | "alert" | "reminder">(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOpen("alert")}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {t("Alerta de tasa")}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {t("Avísame cuando suba")}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOpen("reminder")}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarClock className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {t("Recordatorio")}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {t("Envío recurrente")}
            </span>
          </span>
        </button>
      </div>

      <Sheet
        open={open === "alert"}
        onClose={() => setOpen(null)}
        title={t("Alerta de tasa")}
      >
        <RateAlertCard rates={rates} embedded />
      </Sheet>

      <Sheet
        open={open === "reminder"}
        onClose={() => setOpen(null)}
        title={t("Recordatorios de envío")}
      >
        <ReminderCard sendProps={sendProps} embedded />
      </Sheet>
    </>
  );
}
