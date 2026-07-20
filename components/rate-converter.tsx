"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Card } from "@/components/ui";
import { localAmount, usd } from "@/lib/utils";
import { DELIVERY_CURRENCIES, type ExchangeRate } from "@/lib/types";

const PRESETS = [50, 100, 200, 500];

export function RateConverter({ rates }: { rates: ExchangeRate[] }) {
  const ratesByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.currency] = Number(r.rate);
    return m;
  }, [rates]);

  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("CUP");
  // false: USD → moneda local · true: moneda local → USD
  const [inverse, setInverse] = useState(false);

  const rate = ratesByCurrency[currency] ?? 0;
  const value = parseFloat(amount) || 0;
  const result = inverse ? (rate ? value / rate : 0) : value * rate;

  const fromLabel = inverse ? currency : "USD";
  const toLabel = inverse ? "USD" : currency;

  return (
    <Card className="mb-4 overflow-hidden p-0">
      <div className="hero-gradient p-4 text-white">
        <p className="text-xs font-medium text-white/75">
          Conversor · {fromLabel} → {toLabel}
        </p>
        <p className="tabular mt-1 text-2xl font-extrabold">
          {inverse ? usd(result) : `${localAmount(result)} ${currency}`}
        </p>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1 rounded-xl border border-input bg-background px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              {inverse ? currency : "$"}
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setInverse((v) => !v)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition active:scale-95"
            aria-label="Invertir conversión"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {DELIVERY_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c} · {localAmount(ratesByCurrency[c] ?? 0)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              className="flex-1 rounded-lg border border-border bg-card py-1.5 text-xs font-semibold text-muted-foreground transition active:scale-95"
            >
              {inverse ? localAmount(v) : `$${v}`}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
