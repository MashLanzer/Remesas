"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, Plus, X } from "lucide-react";
import { Card, Select } from "@/components/ui";
import { localAmount } from "@/lib/utils";
import { listRateAlerts, setRateAlert, deleteRateAlert } from "@/app/actions";
import type { ExchangeRate } from "@/lib/types";

type Alert = { id: string; currency: string; target_rate: number };

export function RateAlertCard({
  rates,
  embedded = false,
  bannerOnly = false,
}: {
  rates: ExchangeRate[];
  embedded?: boolean;
  // Solo muestra el aviso "¡la tasa llegó!" (para el inicio). Si no hay
  // ninguna alerta cumplida, no dibuja nada.
  bannerOnly?: boolean;
}) {
  const active = useMemo(
    () => rates.filter((r) => r.active !== false && Number(r.rate) > 0),
    [rates]
  );
  const rateOf = (cur: string) =>
    Number(active.find((r) => r.currency === cur)?.rate ?? 0);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cur, setCur] = useState<string>(active[0]?.currency ?? "CUP");
  const [target, setTarget] = useState("");

  useEffect(() => {
    (async () => {
      setAlerts(await listRateAlerts());
      setReady(true);
    })();
  }, []);

  if (!ready || active.length === 0) return null;

  // Dentro de una hoja (embedded) no se dibuja el marco Card ni el título (la
  // hoja ya los aporta); en el inicio conserva su tarjeta.
  const Wrapper: React.ElementType = embedded ? "div" : Card;

  const met = alerts.filter((a) => {
    const now = rateOf(a.currency);
    return now > 0 && now >= Number(a.target_rate);
  });

  // Solo el aviso para el inicio: nada si ninguna alerta se cumplió.
  if (bannerOnly) {
    if (met.length === 0) return null;
    return (
      <div className="space-y-2">
        {met.map((a) => (
          <div
            key={`met-${a.id}`}
            className="flex items-center gap-2 rounded-2xl border border-income/30 bg-income/10 px-4 py-3 text-sm text-income"
          >
            <BellRing className="h-5 w-5 shrink-0" />
            <span className="min-w-0">
              <span className="font-bold">¡La tasa de {a.currency} llegó!</span>{" "}
              1 USD = {localAmount(rateOf(a.currency))} {a.currency} · buen
              momento para enviar.
            </span>
            <button
              onClick={() => remove(a.id)}
              aria-label="Quitar alerta"
              className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  async function add() {
    const t = parseFloat(target);
    if (!(t > 0)) return;
    const row = await setRateAlert(cur, t);
    if (row) setAlerts((s) => [row, ...s.filter((x) => x.currency !== row.currency)]);
    setTarget("");
    setAdding(false);
  }
  function remove(id: string) {
    setAlerts((s) => s.filter((x) => x.id !== id));
    deleteRateAlert(id);
  }

  return (
    <div className="space-y-2">
      {/* Aviso en vivo cuando una alerta se cumple */}
      {met.map((a) => (
        <div
          key={`met-${a.id}`}
          className="flex items-center gap-2 rounded-2xl border border-income/30 bg-income/10 px-4 py-3 text-sm text-income"
        >
          <BellRing className="h-5 w-5 shrink-0" />
          <span className="min-w-0">
            <span className="font-bold">¡La tasa de {a.currency} llegó!</span>{" "}
            1 USD = {localAmount(rateOf(a.currency))} {a.currency} · buen momento
            para enviar.
          </span>
          <button
            onClick={() => remove(a.id)}
            aria-label="Quitar alerta"
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <Wrapper className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          {embedded ? (
            <span />
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Bell className="h-4 w-4 text-primary" /> Alerta de tasa
            </span>
          )}
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 text-xs font-semibold text-primary transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> Nueva
            </button>
          )}
        </div>

        {adding && (
          <div className="flex items-end gap-2">
            <label className="flex-1 text-xs text-muted-foreground">
              Avísame cuando 1 USD ≥
              <input
                type="number"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="700"
                className="mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
              />
            </label>
            <div className="w-24 shrink-0">
              <Select
                value={cur}
                onChange={(e) => setCur(e.target.value)}
                title="Moneda"
              >
                {active.map((r) => (
                  <option key={r.currency} value={r.currency}>
                    {r.currency}
                  </option>
                ))}
              </Select>
            </div>
            <button
              onClick={add}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition active:scale-95"
            >
              Guardar
            </button>
          </div>
        )}

        {alerts.length === 0 && !adding ? (
          <p className="text-xs text-muted-foreground">
            Te avisamos cuando el cambio llegue a lo que quieras, para enviar en
            el mejor momento.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => {
              const now = rateOf(a.currency);
              const done = now > 0 && now >= Number(a.target_rate);
              return (
                <div
                  key={a.id}
                  className={
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 " +
                    (done
                      ? "border-income/30 bg-income/10"
                      : "border-border bg-muted/40")
                  }
                >
                  <span
                    className={
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                      (done
                        ? "bg-income/15 text-income"
                        : "bg-primary/10 text-primary")
                    }
                  >
                    {done ? (
                      <BellRing className="h-5 w-5" />
                    ) : (
                      <Bell className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">
                      1 USD ≥ {localAmount(Number(a.target_rate))} {a.currency}
                    </p>
                    <p
                      className={
                        "text-xs " +
                        (done ? "font-semibold text-income" : "text-muted-foreground")
                      }
                    >
                      {done
                        ? `¡Cumplida! hoy ${localAmount(now)}`
                        : `Hoy va por ${localAmount(now)} ${a.currency}`}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(a.id)}
                    aria-label="Quitar"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Wrapper>
    </div>
  );
}
