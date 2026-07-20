"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui";
import { localAmount } from "@/lib/utils";
import { DELIVERY_CURRENCIES, type ExchangeRate } from "@/lib/types";

export function RateConverter({ rates }: { rates: ExchangeRate[] }) {
  const ratesByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.currency] = Number(r.rate);
    return m;
  }, [rates]);

  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("CUP");

  const rate = ratesByCurrency[currency] ?? 0;
  const result = (parseFloat(amount) || 0) * rate;

  return (
    <Card className="mb-4 overflow-hidden p-0">
      <div className="hero-gradient p-4 text-white">
        <p className="text-xs font-medium text-white/75">Conversor rápido</p>
        <p className="tabular mt-1 text-2xl font-extrabold">
          {localAmount(result)} {currency}
        </p>
      </div>
      <div className="flex items-center gap-2 p-4">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-muted-foreground">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-24 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          {DELIVERY_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c} (tasa {localAmount(ratesByCurrency[c] ?? 0)})
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}
