"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/sheet";
import { OrderForm, type OrderInitial } from "@/components/order-form";
import { useT } from "@/components/lang-provider";
import type { ExchangeRate } from "@/lib/types";
import type { CommissionRules } from "@/lib/calc";

export function EnviarRemesaCta({
  rates,
  pointsBalance = 0,
  redeemMin = 100,
  pointValue = 0.05,
  variant = "hero",
  label,
  beneficiaries = [],
  initial,
  transferBonusPct,
  commissionRules,
}: {
  rates: ExchangeRate[];
  pointsBalance?: number;
  redeemMin?: number;
  pointValue?: number;
  variant?: "hero" | "primary";
  label?: string;
  beneficiaries?: { name: string; phone: string | null; province: string | null }[];
  initial?: OrderInitial;
  transferBonusPct?: number | null;
  commissionRules?: CommissionRules;
}) {
  const [open, setOpen] = useState(false);
  const tr = useT();
  const buttonLabel = label ?? tr("Enviar una remesa");
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-bold shadow-lg transition active:scale-[0.98]",
          variant === "hero"
            ? "bg-white text-primary shadow-black/10"
            : "bg-primary text-primary-foreground shadow-primary/30"
        )}
      >
        <Send className="h-5 w-5" /> {buttonLabel}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={tr("Enviar una remesa")}
      >
        <OrderForm
          rates={rates}
          onDone={() => setOpen(false)}
          pointsBalance={pointsBalance}
          redeemMin={redeemMin}
          pointValue={pointValue}
          beneficiaries={beneficiaries}
          initial={initial}
          transferBonusPct={transferBonusPct}
          commissionRules={commissionRules}
        />
      </Sheet>
    </>
  );
}
