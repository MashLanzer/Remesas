"use client";

import { useMemo, useState, useTransition } from "react";
import { Upload, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui";
import { importRates } from "@/app/actions";
import { cn, localAmount } from "@/lib/utils";
import type { ExchangeRate } from "@/lib/types";

const VALID = ["CUP", "USD", "MLC", "EUR"];

type Preview = { currency: string; rate: number; old: number | null };

function parsePreview(raw: string, current: Record<string, number>): Preview[] {
  const seen = new Set<string>();
  const out: Preview[] = [];
  for (const line of raw.split(/[\n,;]+/)) {
    const m = line.trim().match(/([A-Za-z]{3})\s*[:=]?\s*([\d.,]+)/);
    if (!m) continue;
    const currency = m[1].toUpperCase();
    if (!VALID.includes(currency) || seen.has(currency)) continue;
    const rate = parseFloat(m[2].replace(",", "."));
    if (isNaN(rate) || rate <= 0) continue;
    seen.add(currency);
    out.push({ currency, rate, old: current[currency] ?? null });
  }
  return out;
}

export function RateImport({ rates = [] }: { rates?: ExchangeRate[] }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [pending, start] = useTransition();

  const current = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.currency] = Number(r.rate);
    return m;
  }, [rates]);

  const preview = useMemo(() => parsePreview(raw, current), [raw, current]);

  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-sm font-semibold text-foreground"
      >
        <Upload className="h-4 w-4 text-primary" />
        Importar tasas del día
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 text-muted-foreground transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <form
          action={(fd) =>
            start(async () => {
              await importRates(fd);
              setRaw("");
              setOpen(false);
            })
          }
          className="space-y-2 border-t border-border p-3.5"
        >
          <p className="text-xs text-muted-foreground">
            Pega las tasas, una por línea o separadas por comas. Reconoce el
            código de moneda y el número.
          </p>
          <textarea
            name="raw"
            rows={4}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"CUP 440\nMLC 260\nEUR 0.92"}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />

          {/* Vista previa: qué cambia respecto a lo que ya tienes */}
          {preview.length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-3">
              {preview.map((p) => {
                const delta =
                  p.old != null && p.old !== 0
                    ? ((p.rate - p.old) / p.old) * 100
                    : null;
                const same = p.old != null && p.old === p.rate;
                return (
                  <div
                    key={p.currency}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-foreground">
                      {p.currency} {localAmount(p.rate)}
                    </span>
                    {p.old == null ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        nueva
                      </span>
                    ) : same ? (
                      <span className="text-[10px] text-muted-foreground">
                        sin cambio
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        antes {localAmount(p.old)}
                        {delta != null && (
                          <span
                            className={cn(
                              "tabular font-semibold",
                              delta >= 0 ? "text-income" : "text-destructive"
                            )}
                          >
                            {delta >= 0 ? "+" : ""}
                            {delta.toFixed(1)}%
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="submit"
            disabled={pending || preview.length === 0}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {pending
              ? "Aplicando…"
              : preview.length > 0
                ? `Aplicar ${preview.length} ${preview.length === 1 ? "tasa" : "tasas"}`
                : "Aplicar tasas"}
          </button>
        </form>
      )}
    </Card>
  );
}
