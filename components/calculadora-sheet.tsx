"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { RateConverter } from "@/components/rate-converter";
import type { ExchangeRate } from "@/lib/types";

export function CalculadoraSheet({ rates }: { rates: ExchangeRate[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition active:scale-[0.98]"
      >
        <Calculator className="h-4 w-4" /> Calcular cuánto recibe tu familia
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Calculadora">
        <RateConverter rates={rates} />
      </Sheet>
    </>
  );
}
