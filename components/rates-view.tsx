"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Minus,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui";
import { upsertRate, toggleCurrencyActive } from "@/app/actions";
import { formatDate, localAmount, cn } from "@/lib/utils";
import {
  DELIVERY_CURRENCIES,
  type ExchangeRate,
  type RateHistory,
} from "@/lib/types";
import { RateImport } from "@/components/rate-import";

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

  const histByCurrency: Record<string, RateHistory[]> = {};
  for (const h of history) {
    (histByCurrency[h.currency] ??= []).push(h);
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

      <RateImport />

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

function roundStep(v: number): number {
  const step = v >= 100 ? 5 : v >= 10 ? 1 : 0.1;
  return Math.round(v / step) * step;
}

function RateRow({
  currency,
  rate,
  history,
}: {
  currency: string;
  rate?: ExchangeRate;
  history: RateHistory[];
}) {
  const [pending, start] = useTransition();
  const initial = rate ? String(rate.rate) : "";
  const [value, setValue] = useState(initial);
  const [marketVal, setMarketVal] = useState(
    rate?.market_rate ? String(rate.market_rate) : ""
  );
  const [expanded, setExpanded] = useState(false);

  const active = rate?.active !== false;
  const dirty = value !== initial;
  const stale = rate ? daysSince(rate.updated_at) >= STALE_DAYS : false;

  const currentRate = rate ? Number(rate.rate) : null;
  const prev =
    history.length >= 2 ? Number(history[history.length - 2].rate) : null;
  const delta =
    prev != null && currentRate != null && prev !== 0
      ? ((currentRate - prev) / prev) * 100
      : null;

  // Mercado y margen en vivo (según lo que estás escribiendo).
  const mkNum = parseFloat(marketVal) || 0;
  const rateNum = parseFloat(value) || 0;
  const spread =
    mkNum > 0 && rateNum > 0 ? ((rateNum - mkNum) / mkNum) * 100 : null;
  // Ganancia por cada $100 cuando tu tasa está por debajo del mercado.
  const gainPer100 =
    mkNum > 0 && rateNum > 0 && rateNum < mkNum
      ? ((mkNum - rateNum) / mkNum) * 100
      : null;

  function bump(step: number) {
    const n = (parseFloat(value) || 0) + step;
    setValue(String(Math.max(Number(n.toFixed(4)), 0)));
  }
  function round() {
    setValue(String(roundStep(parseFloat(value) || 0)));
  }
  function applyMargin(pct: number) {
    if (mkNum <= 0) return;
    setValue(String(Number((mkNum * (1 - pct / 100)).toFixed(4))));
  }

  return (
    <Card className={cn("p-3.5", !active && "opacity-55")}>
      <form
        action={(fd) => start(() => upsertRate(fd))}
        className="space-y-2.5"
      >
        <input type="hidden" name="currency" value={currency} />

        {/* Cabecera: moneda + variación + sparkline + ocultar */}
        <div className="flex items-center gap-2">
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
          {!active && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
              oculta
            </span>
          )}
          {history.length >= 2 && (
            <Sparkline values={history.slice(-10).map((h) => Number(h.rate))} />
          )}
          <span
            className={cn(
              "ml-auto flex items-center gap-0.5 text-[10px]",
              stale ? "text-warning" : "text-muted-foreground"
            )}
          >
            {stale && <AlertCircle className="h-2.5 w-2.5" />}
            {rate ? formatDate(rate.updated_at) : "nueva"}
          </span>
          <HideButton currency={currency} active={active} />
        </div>

        {/* Edición: ± tasa redondeo guardar */}
        <div className="flex items-center gap-2">
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
            type="button"
            onClick={round}
            className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition active:scale-95"
            aria-label="Redondear"
            title="Redondear"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            type="submit"
            disabled={pending || !dirty}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition disabled:opacity-40"
            aria-label="Guardar tasa"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>

        {/* Tasa de mercado + spread */}
        <div className="flex items-center gap-2 text-xs">
          <span className="shrink-0 text-muted-foreground">Mercado</span>
          <input
            type="number"
            name="market_rate"
            step="0.0001"
            min="0"
            value={marketVal}
            onChange={(e) => setMarketVal(e.target.value)}
            placeholder="opcional"
            className="w-24 rounded-lg border border-input bg-background px-2 py-1 text-center text-foreground outline-none focus:border-ring"
          />
          {spread != null && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                spread >= 0
                  ? "bg-income/10 text-income"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {spread >= 0 ? "+" : ""}
              {spread.toFixed(1)}% vs mercado
            </span>
          )}
          {history.length >= 1 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="ml-auto flex items-center gap-0.5 text-muted-foreground"
            >
              Historial
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")}
              />
            </button>
          )}
        </div>

        {/* Aplicar margen desde el mercado */}
        {mkNum > 0 && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-muted-foreground">
              Margen
            </span>
            {[3, 5, 8].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyMargin(pct)}
                className="flex-1 rounded-lg border border-border py-1.5 text-[11px] font-semibold text-foreground transition active:scale-95"
              >
                {pct}%
              </button>
            ))}
            {gainPer100 != null && (
              <span className="shrink-0 rounded-full bg-income/10 px-2 py-0.5 text-[10px] font-semibold text-income">
                ≈ ${gainPer100.toFixed(2)} / $100
              </span>
            )}
          </div>
        )}

        {/* Historial expandible */}
        {expanded && history.length >= 1 && (
          <div className="space-y-2 border-t border-border pt-2.5">
            {history.length >= 2 && (
              <BigChart values={history.map((h) => Number(h.rate))} />
            )}
            <div className="space-y-1">
              {[...history].reverse().slice(0, 12).map((h, i, arr) => {
                const before = arr[i + 1] ? Number(arr[i + 1].rate) : null;
                const d =
                  before != null && before !== 0
                    ? ((Number(h.rate) - before) / before) * 100
                    : null;
                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-muted-foreground">
                      {formatDate(h.changed_at)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular font-medium text-foreground">
                        {localAmount(Number(h.rate))}
                      </span>
                      {d != null && Math.abs(d) >= 0.01 && (
                        <span
                          className={cn(
                            "tabular w-12 text-right",
                            d >= 0 ? "text-income" : "text-destructive"
                          )}
                        >
                          {d >= 0 ? "+" : ""}
                          {d.toFixed(1)}%
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}

function HideButton({ currency, active }: { currency: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <form action={(fd) => start(() => toggleCurrencyActive(fd))}>
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending}
        className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition active:scale-90 disabled:opacity-50"
        aria-label={active ? "Ocultar moneda" : "Mostrar moneda"}
        title={active ? "Ocultar" : "Mostrar"}
      >
        {active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
    </form>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const W = 44;
  const H = 20;
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

function BigChart({ values }: { values: number[] }) {
  const W = 300;
  const H = 70;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const x = (i: number) => pad + (i / Math.max(n - 1, 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  const up = values[n - 1] >= values[0];
  const stroke = up ? "hsl(var(--income))" : "hsl(var(--destructive))";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={2} fill={stroke} />
      ))}
    </svg>
  );
}
