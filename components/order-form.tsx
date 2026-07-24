"use client";

import { useMemo, useState } from "react";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";
import { createOrder } from "@/app/actions";
import { localAmount, usd } from "@/lib/utils";
import { DELIVERY_CURRENCIES, type ExchangeRate } from "@/lib/types";

type Benef = { name: string; phone: string | null; province: string | null };

export function OrderForm({
  rates,
  onDone,
  pointsBalance = 0,
  redeemMin = 100,
  pointValue = 0.05,
  beneficiaries = [],
}: {
  rates: ExchangeRate[];
  onDone?: () => void;
  pointsBalance?: number;
  redeemMin?: number;
  pointValue?: number;
  beneficiaries?: Benef[];
}) {
  const ratesByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.currency] = Number(r.rate);
    return m;
  }, [rates]);

  const available = useMemo(
    () =>
      DELIVERY_CURRENCIES.filter(
        (c) => rates.find((r) => r.currency === c)?.active !== false
      ),
    [rates]
  );

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(available[0] ?? "CUP");
  const [bName, setBName] = useState("");
  const [bPhone, setBPhone] = useState("");
  const [bProv, setBProv] = useState("");

  function pickBenef(b: Benef) {
    setBName(b.name);
    setBPhone(b.phone ?? "");
    setBProv(b.province ?? "");
  }

  const amountNum = parseFloat(amount) || 0;
  const rate = ratesByCurrency[currency] ?? 0;
  const receives = amountNum * rate;

  return (
    <form
      action={async (fd) => {
        await createOrder(fd);
        onDone?.();
      }}
      className="space-y-3"
    >
      <Field label="¿Cuánto quieres enviar? (USD)">
        <Input
          type="number"
          name="amount_usd"
          inputMode="decimal"
          step="0.01"
          min="1"
          placeholder="100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </Field>

      <Field label="Moneda que recibe tu familia">
        <Select
          name="delivery_currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          title="Moneda"
        >
          {available.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      {amountNum > 0 && rate > 0 && (
        <div className="rounded-xl bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Tu familia recibe hasta
          </p>
          <p className="text-lg font-bold text-foreground">
            {localAmount(receives)} {currency}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Por {usd(amountNum)} · antes de la comisión. El monto final lo
            confirma el negocio.
          </p>
        </div>
      )}

      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          ¿Quién recibe en Cuba?
        </p>

        {beneficiaries.length > 0 && (
          <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
            {beneficiaries.map((b, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickBenef(b)}
                className={
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 " +
                  (bName === b.name
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground")
                }
              >
                {b.name}
                {b.province ? (
                  <span className="text-muted-foreground">· {b.province}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}

        <Field label="Nombre del beneficiario">
          <Input
            name="beneficiary_name"
            placeholder="Nombre de quien recibe"
            value={bName}
            onChange={(e) => setBName(e.target.value)}
            required
          />
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input
              name="beneficiary_phone"
              inputMode="tel"
              placeholder="+53…"
              value={bPhone}
              onChange={(e) => setBPhone(e.target.value)}
            />
          </Field>
          <Field label="Provincia">
            <Input
              name="province"
              placeholder="Ej: La Habana"
              value={bProv}
              onChange={(e) => setBProv(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <Field label="Nota (opcional)">
        <Textarea name="note" rows={2} placeholder="Algún detalle para el negocio…" />
      </Field>

      {pointsBalance >= redeemMin && (
        <label className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <input
            type="checkbox"
            name="redeem"
            className="mt-0.5 h-4 w-4 accent-[color:hsl(var(--primary))]"
          />
          <span className="text-sm">
            <span className="font-semibold text-foreground">Usar mis puntos</span>
            <span className="block text-xs text-muted-foreground">
              Tienes {pointsBalance} puntos (hasta {usd(pointsBalance * pointValue)}).
              El negocio aplica el descuento al aceptar.
            </span>
          </span>
        </label>
      )}

      <Button type="submit" className="w-full">
        Enviar pedido
      </Button>
    </form>
  );
}
