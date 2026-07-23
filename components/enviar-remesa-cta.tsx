"use client";

import { useState } from "react";
import { Send, ChevronRight } from "lucide-react";
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
        className="flex w-full items-center gap-4 rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 p-5 text-left text-white shadow-xl transition active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Send className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold">Enviar una remesa</p>
          <p className="text-xs text-white/80">Tu familia recibe en pocas horas</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-white/80" />
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
