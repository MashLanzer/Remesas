"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { OrderForm } from "@/components/order-form";
import type { ExchangeRate } from "@/lib/types";

export function EnviarRemesaCta({
  rates,
  pointsBalance = 0,
  redeemMin = 100,
  pointValue = 0.05,
}: {
  rates: ExchangeRate[];
  pointsBalance?: number;
  redeemMin?: number;
  pointValue?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-base font-bold text-emerald-700 shadow-lg shadow-black/10 transition active:scale-[0.98]"
      >
        <Send className="h-5 w-5" /> Enviar una remesa
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
