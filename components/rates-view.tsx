"use client";

import { useState, useTransition } from "react";
import { Check, Minus, Plus, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui";
import { upsertRate } from "@/app/actions";
import { formatDate, localAmount, cn } from "@/lib/utils";
import {
  DELIVERY_CURRENCIES,
  type ExchangeRate,
  type RateHistory,
} from "@/lib/types";

const STALE_DAYS = 3;

export function RatesView({
  rates,
  history = [],
}: {
  rates: ExchangeRate[];
  history?: RateHistory[];
}) {
  const byCurrency: Record<string, ExchangeRate | undefined> = {};
  for (const r of rates) byCurrency[r.currency] = r;

  const histByCurrency: Record<string, number[]> = {};
  for (const h of history) {
    (histByCurrency[h.currency] ??= []).push(Number(h.rate));
  }

  return (
    <div className="space-y-2">
      {DELIVERY_CURRENCIES.map((c) => (
        <RateRow
          key={c}
          currency={c}
          rate={byCurrency[c]}
          history={histByCurrency[c] ?? []}
        />
      ))}
      <p className="pt-2 text-center text-xs text-muted-foreground">
        1 USD = tasa · unidades locales. Ajústala al mercado del día.
      </p>
    </div>
  );
}

function daysSince(dateStr: string): number {
  const t = new Date(dateStr).getTime();
  return Math.floor((Date.now() - t) / 86400000);
}

function RateRow({
  currency,
  rate,
  history,
}: {
  currency: string;
  rate?: ExchangeRate;
  history: number[];
}) {
  const [pending, start] = useTransition();
  const initial = rate ? String(rate.rate) : "";
  const [value, setValue] = useState(initial);

  const dirty = value !== initial;
  const stale = rate ? daysSince(rate.updated_at) >= STALE_DAYS : false;

  // Variación respecto al cambio anterior guardado en el historial
  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const currentRate = rate ? Number(rate.rate) : null;
  const delta =
    prev != null && currentRate != null && prev !== 0
      ? ((currentRate - prev) / prev) * 100
      : null;

  function bump(step: number) {
    const n = (parseFloat(value) || 0) + step;
    setValue(String(Math.max(n, 0)));
  }

  return (
    <Card className="p-3.5">
      <form
        action={(fd) => start(() => upsertRate(fd))}
        className="flex items-center gap-3"
      >
        <input type="hidden" name="currency" value={currency} />

        <div className="w-20 shrink-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground">{currency}</p>
            {delta != null && Math.abs(delta) >= 0.01 && (
              <span
                className={cn(
                  "flex items-center text-[10px] font-semibold",
                  delta >= 0 ? "text-income" : "text-destructive"
                )}
              >
                {delta >= 0 ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
          </div>
          <p
            className={cn(
              "flex items-center gap-0.5 text-[10px]",
              stale ? "text-warning" : "text-muted-foreground"
            )}
          >
            {stale && <AlertCircle className="h-2.5 w-2.5" />}
            {rate ? formatDate(rate.updated_at) : "nueva"}
          </p>
        </div>

        {history.length >= 2 && <Sparkline values={history.slice(-10)} />}

        <button
          type="button"
          onClick={() => bump(-1)}
          className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition active:scale-95"
          aria-label="Bajar"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <input
          type="number"
          name="rate"
          step="0.0001"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-center text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />

        <button
          type="button"
          onClick={() => bump(1)}
          className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition active:scale-95"
          aria-label="Subir"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <button
          type="submit"
          disabled={pending || !dirty}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground transition disabled:opacity-40",
            "bg-primary"
          )}
          aria-label="Guardar tasa"
        >
          <Check className="h-4 w-4" />
        </button>
      </form>
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const W = 48;
  const H = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(n - 1, 1)) * W;
      const y = H - ((v - min) / span) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = values[n - 1] >= values[0];
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="hidden shrink-0 sm:block"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={up ? "hsl(var(--income))" : "hsl(var(--destructive))"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
