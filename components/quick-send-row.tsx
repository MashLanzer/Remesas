"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { OrderForm, type OrderInitial } from "@/components/order-form";
import type { ExchangeRate } from "@/lib/types";

type Benef = { name: string; phone: string | null; province: string | null };

export function QuickSendRow({
  rates,
  pointsBalance,
  redeemMin,
  pointValue,
  beneficiaries,
  transferBonusPct,
  commissionRules,
}: {
  rates: ExchangeRate[];
  pointsBalance: number;
  redeemMin: number;
  pointValue: number;
  beneficiaries: Benef[];
  transferBonusPct?: number | null;
  commissionRules?: import("@/lib/calc").CommissionRules;
}) {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<OrderInitial | undefined>();

  if (beneficiaries.length === 0) return null;

  function send(b?: Benef) {
    setInitial(
      b
        ? {
            name: b.name,
            phone: b.phone ?? undefined,
            province: b.province ?? undefined,
          }
        : undefined
    );
    setOpen(true);
  }

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
        <span className="h-4 w-1 rounded-full bg-primary" />
        Enviar rápido
      </h2>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {beneficiaries.map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => send(b)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5 transition active:scale-95"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary ring-1 ring-primary/15">
              {b.name.charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[4rem] truncate text-[11px] font-medium text-muted-foreground">
              {b.name.split(" ")[0]}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => send()}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5 transition active:scale-95"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground">
            <Plus className="h-6 w-6" />
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            Nuevo
          </span>
        </button>
      </div>

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
          beneficiaries={beneficiaries}
          transferBonusPct={transferBonusPct}
          commissionRules={commissionRules}
          initial={initial}
        />
      </Sheet>
    </section>
  );
}
