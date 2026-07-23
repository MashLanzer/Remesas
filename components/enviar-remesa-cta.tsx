"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/sheet";
import { OrderForm } from "@/components/order-form";
import type { ExchangeRate } from "@/lib/types";

export function EnviarRemesaCta({
  rates,
  pointsBalance = 0,
  redeemMin = 100,
  pointValue = 0.05,
  variant = "hero",
  label = "Enviar una remesa",
}: {
  rates: ExchangeRate[];
  pointsBalance?: number;
  redeemMin?: number;
  pointValue?: number;
  variant?: "hero" | "primary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-bold shadow-lg transition active:scale-[0.98]",
          variant === "hero"
            ? "bg-white text-emerald-700 shadow-black/10"
            : "bg-primary text-primary-foreground shadow-primary/30"
        )}
      >
        <Send className="h-5 w-5" /> {label}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Enviar una remesa"
      >
        <OrderForm
          rates={rates}
          onDone={() => setOpen(false)}
          pointsBalance={pointsBalance}
          redeemMin={redeemMin}
          pointValue={pointValue}
        />
      </Sheet>
    </>
  );
}
