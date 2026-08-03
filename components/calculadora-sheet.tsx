"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { RateConverter } from "@/components/rate-converter";
import type { ExchangeRate } from "@/lib/types";

export function CalculadoraSheet({
  rates,
  variant = "hero",
}: {
  rates: ExchangeRate[];
  variant?: "hero" | "plain" | "link";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "link" ? (
        // Enlace compacto para ir dentro del hero (texto blanco).
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-white/85 underline underline-offset-2 transition active:scale-95"
        >
          <Calculator className="h-3.5 w-3.5" /> Conversor de tasa
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            "flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition active:scale-[0.98] " +
            (variant === "hero"
              ? "bg-white/15 text-white backdrop-blur"
              : "border border-border bg-card text-foreground")
          }
        >
          <Calculator className="h-4 w-4" /> Conversor de tasa
        </button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Calculadora">
        <RateConverter rates={rates} />
      </Sheet>
    </>
  );
}
