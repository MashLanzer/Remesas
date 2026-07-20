"use client";

import { useMemo, useState } from "react";
import { Field, Input, Select, Textarea, Button, Card } from "@/components/ui";
import {
  calcCommission,
  computeRemittance,
  type CommissionRules,
} from "@/lib/calc";
import { usd, localAmount } from "@/lib/utils";
import { createRemittance, updateRemittance } from "@/app/actions";
import {
  DELIVERY_CURRENCIES,
  PAYMENT_METHODS,
  type Beneficiary,
  type Client,
  type ExchangeRate,
  type Remittance,
} from "@/lib/types";

export function RemittanceForm({
  clients,
  beneficiaries,
  rates,
  defaultSplit,
  initial,
  prefill,
  rules,
  defaultCurrency = "CUP",
  defaultPayment,
  defaultClientId,
  defaultBeneficiaryId,
}: {
  clients: Client[];
  beneficiaries: Beneficiary[];
  rates: ExchangeRate[];
  defaultSplit: number;
  initial?: Remittance;
  prefill?: Remittance;
  rules?: CommissionRules;
  defaultCurrency?: string;
  defaultPayment?: string | null;
  defaultClientId?: string;
  defaultBeneficiaryId?: string;
}) {
  const isEdit = !!initial;
  const source = initial ?? prefill; // valores para prellenar (editar o duplicar)

  const ratesByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.currency] = Number(r.rate);
    return m;
  }, [rates]);

  const [amount, setAmount] = useState(
    source ? String(source.amount_usd) : ""
  );
  const [commission, setCommission] = useState(
    source ? String(source.commission) : ""
  );
  const [commissionTouched, setCommissionTouched] = useState(!!source);
  const [currency, setCurrency] = useState<string>(
    source?.delivery_currency ?? defaultCurrency
  );
  const [rate, setRate] = useState(
    source
      ? String(source.exchange_rate)
      : String(ratesByCurrency[defaultCurrency] ?? "")
  );
  const [exchangeProfit, setExchangeProfit] = useState(
    source && Number(source.exchange_profit) ? String(source.exchange_profit) : ""
  );
  const [split, setSplit] = useState(
    String(source?.my_split_percent ?? defaultSplit ?? 50)
  );

  const amountNum = parseFloat(amount) || 0;

  // La comisión se calcula sola mientras no la editen a mano.
  const effectiveCommission = commissionTouched
    ? parseFloat(commission) || 0
    : calcCommission(amountNum, rules);

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
    <form
      action={isEdit ? updateRemittance : createRemittance}
      className="space-y-4"
    >
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}
      {/* Datos del envío */}
      <Card className="space-y-4">
        <Field label="Fecha">
          <Input
            type="date"
            name="date"
            defaultValue={initial?.date ?? today()}
          />
        </Field>

        <Field label="Cliente (quien paga)">
          <Select
            name="client_id"
            defaultValue={source?.client_id ?? defaultClientId ?? ""}
          >
            <option value="">— Sin cliente —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Beneficiario (quien recibe en Cuba)">
          <Select
            name="beneficiary_id"
            defaultValue={source?.beneficiary_id ?? defaultBeneficiaryId ?? ""}
          >
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
          hint={`Automática: ${rules?.commission_percent ?? 10}% si ≥ $${
            rules?.commission_threshold ?? 100
          }, o $${rules?.commission_flat ?? 5} fijos. Puedes editarla.`}
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
          <Select
            name="payment_method"
            defaultValue={source?.payment_method ?? defaultPayment ?? ""}
          >
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
          <Select name="status" defaultValue={initial?.status ?? "pendiente"}>
            <option value="pendiente">Pendiente</option>
            <option value="entregado">Entregado</option>
            <option value="liquidado">Liquidado</option>
          </Select>
        </Field>

        <Field label="¿El cliente ya te pagó?">
          <Select
            name="client_paid"
            defaultValue={source?.client_paid === false ? "false" : "true"}
          >
            <option value="true">Sí, ya cobrado</option>
            <option value="false">No, aún debe</option>
          </Select>
        </Field>

        <Field
          label="Comprobante (foto, opcional)"
          hint={
            initial?.receipt_url
              ? "Ya hay una foto guardada. Sube otra para reemplazarla."
              : "Captura de Zelle, CashApp, etc."
          }
        >
          <input
            type="file"
            name="receipt"
            accept="image/*"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
          />
        </Field>

        <Field label="Notas">
          <Textarea
            name="notes"
            rows={2}
            placeholder="Referencia, detalles…"
            defaultValue={source?.notes ?? ""}
          />
        </Field>
      </Card>

      {/* Resumen en vivo */}
      <Card className="overflow-hidden p-0">
        <div className="hero-gradient p-4 text-white">
          <p className="text-xs font-medium text-white/75">Cobras al cliente</p>
          <p className="tabular text-3xl font-extrabold">
            {usd(summary.totalReceived)}
          </p>
        </div>
        <div className="space-y-2 p-4">
          <SummaryRow label="Comisión" value={usd(effectiveCommission)} />
          <SummaryRow label="Ganancia total" value={usd(summary.totalProfit)} />
          <div className="my-1 border-t border-border" />
          <SummaryRow label="Tu parte" value={usd(summary.myShare)} tone="positive" />
          <SummaryRow
            label="Parte del socio"
            value={usd(summary.partnerShare)}
          />
        </div>
      </Card>

      <Button type="submit" className="w-full">
        {isEdit ? "Guardar cambios" : "Guardar remesa"}
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
