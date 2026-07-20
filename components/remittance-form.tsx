"use client";

import { useMemo, useState } from "react";
import { Field, Input, Select, Textarea, Button, Card } from "@/components/ui";
import { calcCommission, computeRemittance } from "@/lib/calc";
import { usd, localAmount } from "@/lib/utils";
import { createRemittance } from "@/app/actions";
import {
  DELIVERY_CURRENCIES,
  PAYMENT_METHODS,
  type Beneficiary,
  type Client,
  type ExchangeRate,
} from "@/lib/types";

export function RemittanceForm({
  clients,
  beneficiaries,
  rates,
  defaultSplit,
}: {
  clients: Client[];
  beneficiaries: Beneficiary[];
  rates: ExchangeRate[];
  defaultSplit: number;
}) {
  const ratesByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.currency] = Number(r.rate);
    return m;
  }, [rates]);

  const [amount, setAmount] = useState("");
  const [commission, setCommission] = useState("");
  const [commissionTouched, setCommissionTouched] = useState(false);
  const [currency, setCurrency] = useState("CUP");
  const [rate, setRate] = useState(String(ratesByCurrency["CUP"] ?? ""));
  const [exchangeProfit, setExchangeProfit] = useState("");
  const [split, setSplit] = useState(String(defaultSplit ?? 50));

  const amountNum = parseFloat(amount) || 0;

  // La comisión se calcula sola mientras no la editen a mano.
  const effectiveCommission = commissionTouched
    ? parseFloat(commission) || 0
    : calcCommission(amountNum);

  const summary = computeRemittance({
    amountUsd: amountNum,
    commission: effectiveCommission,
    exchangeRate: parseFloat(rate) || 0,
    exchangeProfit: parseFloat(exchangeProfit) || 0,
    mySplitPercent: parseFloat(split) || 0,
  });

  function onCurrencyChange(c: string) {
    setCurrency(c);
    const r = ratesByCurrency[c];
    if (r != null) setRate(String(r));
  }

  return (
    <form action={createRemittance} className="space-y-4">
      {/* Datos del envío */}
      <Card className="space-y-4">
        <Field label="Fecha">
          <Input type="date" name="date" defaultValue={today()} />
        </Field>

        <Field label="Cliente (quien paga)">
          <Select name="client_id" defaultValue="">
            <option value="">— Sin cliente —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Beneficiario (quien recibe en Cuba)">
          <Select name="beneficiary_id" defaultValue="">
            <option value="">— Sin beneficiario —</option>
            {beneficiaries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.province ? ` · ${b.province}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Monto del envío (USD)" hint="Lo que se entrega a la familia">
          <Input
            type="number"
            name="amount_usd"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>

        <Field
          label="Comisión (USD)"
          hint="Automática: 10% si es ≥ $100, o $5 fijos si es menor. Puedes editarla."
        >
          <Input
            type="number"
            name="commission"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={commissionTouched ? commission : String(effectiveCommission)}
            onChange={(e) => {
              setCommissionTouched(true);
              setCommission(e.target.value);
            }}
          />
        </Field>

        <Field label="Método de pago recibido">
          <Select name="payment_method" defaultValue="">
            <option value="">— Selecciona —</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {/* Entrega en Cuba */}
      <Card className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Entrega en Cuba
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Moneda">
            <Select
              name="delivery_currency"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
            >
              {DELIVERY_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tasa de cambio" hint="Editable">
            <Input
              type="number"
              name="exchange_rate"
              inputMode="decimal"
              step="0.0001"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
        </div>

        <div className="rounded-xl bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">Entregar a la familia</p>
          <p className="text-lg font-semibold text-foreground">
            {localAmount(summary.localAmount)} {currency}
          </p>
        </div>

        <Field
          label="Ganancia por cambio (spread, USD)"
          hint="Opcional. Solo si el diferencial de la tasa deja ganancia extra."
        >
          <Input
            type="number"
            name="exchange_profit"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            value={exchangeProfit}
            onChange={(e) => setExchangeProfit(e.target.value)}
          />
        </Field>
      </Card>

      {/* Reparto y estado */}
      <Card className="space-y-4">
        <Field
          label={`Tu parte de la ganancia (%) — el resto es del socio`}
          hint={`Tú ${split || 0}% · Socio ${100 - (parseFloat(split) || 0)}%`}
        >
          <Input
            type="number"
            name="my_split_percent"
            inputMode="decimal"
            step="1"
            min="0"
            max="100"
            value={split}
            onChange={(e) => setSplit(e.target.value)}
          />
        </Field>

        <Field label="Estado">
          <Select name="status" defaultValue="pendiente">
            <option value="pendiente">Pendiente</option>
            <option value="entregado">Entregado</option>
            <option value="liquidado">Liquidado</option>
          </Select>
        </Field>

        <Field label="Notas">
          <Textarea name="notes" rows={2} placeholder="Referencia, detalles…" />
        </Field>
      </Card>

      {/* Resumen en vivo */}
      <Card className="space-y-2 border-border bg-muted">
        <SummaryRow label="Cobras al cliente" value={usd(summary.totalReceived)} strong />
        <SummaryRow label="Comisión" value={usd(effectiveCommission)} />
        <SummaryRow label="Ganancia total" value={usd(summary.totalProfit)} />
        <div className="my-1 border-t border-border" />
        <SummaryRow label="Tu parte" value={usd(summary.myShare)} tone="positive" />
        <SummaryRow label="Parte del socio" value={usd(summary.partnerShare)} />
      </Card>

      <Button type="submit" className="w-full">
        Guardar remesa
      </Button>
    </form>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "positive";
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          (strong ? "font-semibold " : "font-medium ") +
          (tone === "positive" ? "text-income" : "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
