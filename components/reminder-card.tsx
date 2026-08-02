"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, X, Clock } from "lucide-react";
import { Card } from "@/components/ui";
import { EnviarRemesaCta } from "@/components/enviar-remesa-cta";
import { usd } from "@/lib/utils";
import { listReminders, addReminder, snoozeReminder, deleteReminder } from "@/app/actions";
import type { ExchangeRate } from "@/lib/types";

type Reminder = {
  id: string;
  label: string;
  name: string | null;
  phone: string | null;
  province: string | null;
  amount_usd: number;
  currency: string;
  interval_days: number;
  next_at: string;
};

type SendProps = {
  rates: ExchangeRate[];
  pointsBalance: number;
  redeemMin: number;
  pointValue: number;
  beneficiaries: { name: string; phone: string | null; province: string | null }[];
};

const FREQS = [
  { d: 7, label: "Semanal" },
  { d: 15, label: "Quincenal" },
  { d: 30, label: "Mensual" },
];

export function ReminderCard({ sendProps }: { sendProps: SendProps }) {
  const currencies = useMemo(
    () => sendProps.rates.filter((r) => r.active !== false).map((r) => r.currency),
    [sendProps.rates]
  );
  const [items, setItems] = useState<Reminder[]>([]);
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(currencies[0] ?? "CUP");
  const [freq, setFreq] = useState(30);

  useEffect(() => {
    (async () => {
      setItems(await listReminders());
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  const today = new Date().toISOString().slice(0, 10);
  const due = items.filter((r) => r.next_at <= today);

  async function add() {
    const amt = parseFloat(amount);
    if (!label.trim() || !(amt > 0)) return;
    const row = await addReminder({
      label: label.trim(),
      name: label.trim(),
      amount_usd: amt,
      currency,
      interval_days: freq,
    });
    if (row) setItems((s) => [...s, row].sort((a, b) => a.next_at.localeCompare(b.next_at)));
    setLabel("");
    setAmount("");
    setAdding(false);
  }
  async function snooze(id: string) {
    const next = await snoozeReminder(id);
    if (next)
      setItems((s) =>
        s.map((r) => (r.id === id ? { ...r, next_at: next } : r)).sort((a, b) =>
          a.next_at.localeCompare(b.next_at)
        )
      );
  }
  function remove(id: string) {
    setItems((s) => s.filter((r) => r.id !== id));
    deleteReminder(id);
  }

  return (
    <div className="space-y-2">
      {/* Recordatorios vencidos: es hora de enviar */}
      {due.map((r) => (
        <Card key={`due-${r.id}`} className="space-y-2.5 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                Es hora de enviar a {r.label}
              </p>
              <p className="text-xs text-muted-foreground">
                Tu recordatorio de {usd(Number(r.amount_usd))} en {r.currency}.
              </p>
            </div>
            <button
              onClick={() => remove(r.id)}
              aria-label="Quitar recordatorio"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <EnviarRemesaCta
                rates={sendProps.rates}
                pointsBalance={sendProps.pointsBalance}
                redeemMin={sendProps.redeemMin}
                pointValue={sendProps.pointValue}
                beneficiaries={sendProps.beneficiaries}
                variant="primary"
                label="Enviar ahora"
                initial={{
                  amount: String(r.amount_usd),
                  currency: r.currency,
                  name: r.name || r.label,
                  phone: r.phone || undefined,
                  province: r.province || undefined,
                }}
              />
            </div>
            <button
              onClick={() => snooze(r.id)}
              className="flex items-center gap-1.5 rounded-2xl border border-border px-3 text-sm font-semibold text-foreground transition active:scale-95"
            >
              <Clock className="h-4 w-4" /> Después
            </button>
          </div>
        </Card>
      ))}

      {/* Gestión de recordatorios */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <CalendarClock className="h-4 w-4 text-primary" /> Recordatorios de envío
          </span>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1 text-xs font-semibold text-primary transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> Nuevo
            </button>
          )}
        </div>

        {adding && (
          <div className="space-y-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="¿A quién? Ej: Mamá"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Monto USD"
                className="w-24 rounded-lg border border-input bg-background px-2 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                title="Moneda"
                className="rounded-lg border border-input bg-background px-2 py-2 text-sm font-semibold text-foreground outline-none"
              >
                {(currencies.length ? currencies : ["CUP"]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={freq}
                onChange={(e) => setFreq(Number(e.target.value))}
                title="Frecuencia"
                className="flex-1 rounded-lg border border-input bg-background px-2 py-2 text-sm font-semibold text-foreground outline-none"
              >
                {FREQS.map((f) => (
                  <option key={f.d} value={f.d}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={add}
              className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              Crear recordatorio
            </button>
          </div>
        )}

        {items.length === 0 && !adding ? (
          <p className="text-xs text-muted-foreground">
            Programa un recordatorio (ej. mensual) para no olvidar el envío a tu
            familia. Te avisamos aquí cuando toque.
          </p>
        ) : (
          <div className="space-y-1.5">
            {items
              .filter((r) => r.next_at > today)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate text-foreground">
                    <span className="font-semibold">{r.label}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      · {usd(Number(r.amount_usd))} · próx.{" "}
                      {new Date(r.next_at + "T00:00:00").toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </span>
                  <button
                    onClick={() => remove(r.id)}
                    aria-label="Quitar"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
