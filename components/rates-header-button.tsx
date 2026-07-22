"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { RatesView } from "@/components/rates-view";
import { RateConverter } from "@/components/rate-converter";
import type { ExchangeRate, RateHistory } from "@/lib/types";

// Botón del header que abre las tasas de cambio en un sheet.
export function RatesHeaderButton({
  rates,
  history,
}: {
  rates: ExchangeRate[];
  history: RateHistory[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
        aria-label="Tasas de cambio"
        title="Tasas de cambio"
      >
        <TrendingUp className="h-5 w-5" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Tasas de cambio">
        <RateConverter rates={rates} />
        <h2 className="mb-2 mt-4 text-sm font-bold text-foreground">
          Editar tasas
        </h2>
        <RatesView rates={rates} history={history} />
      </Sheet>
    </>
  );
}
