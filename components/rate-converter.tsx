"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import { Card, Select } from "@/components/ui";
import { localAmount, usd, cn } from "@/lib/utils";
import { DELIVERY_CURRENCIES, type ExchangeRate } from "@/lib/types";

const PRESETS = [50, 100, 200, 500];

export function RateConverter({ rates }: { rates: ExchangeRate[] }) {
  const ratesByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.currency] = Number(r.rate);
    return m;
  }, [rates]);

  const marketByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) if (r.market_rate) m[r.currency] = Number(r.market_rate);
    return m;
  }, [rates]);

  const available = useMemo(() => {
    const hidden = new Set(
      rates.filter((r) => r.active === false).map((r) => r.currency)
    );
    return DELIVERY_CURRENCIES.filter((c) => !hidden.has(c));
  }, [rates]);

  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState<string>(available[0] ?? "CUP");
  // false: USD → moneda local · true: moneda local → USD
  const [inverse, setInverse] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const rate = ratesByCurrency[currency] ?? 0;
  const value = parseFloat(amount) || 0;
  const result = inverse ? (rate ? value / rate : 0) : value * rate;

  // Ganancia del operador para este monto: tu tasa vs mercado (USD → local).
  const market = marketByCurrency[currency] ?? 0;
  const gain =
    !inverse && market > rate && rate > 0 && value > 0
      ? (value * (market - rate)) / market
      : null;

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
        {gain != null && (
          <p className="mt-1 text-xs font-semibold text-white/90">
            Tu ganancia ≈ {usd(gain)}
          </p>
        )}
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

          <Select
            title="Moneda"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="flex-1 px-3 py-2"
          >
            {available.map((c) => (
              <option key={c} value={c}>
                {c} · {localAmount(ratesByCurrency[c] ?? 0)}
              </option>
            ))}
          </Select>
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

        {/* Comparar el mismo monto en todas las monedas activas */}
        {!inverse && available.length > 1 && (
          <div>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition active:scale-95"
            >
              Ver {usd(value)} en todas las monedas
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition", showAll && "rotate-180")}
              />
            </button>
            {showAll && (
              <div className="mt-2 space-y-1.5 border-t border-border pt-2.5">
                {available.map((c) => (
                  <div
                    key={c}
                    className="flex items-baseline justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{c}</span>
                    <span className="tabular font-semibold text-foreground">
                      {localAmount(value * (ratesByCurrency[c] ?? 0))} {c}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
