"use client";

import { useMemo, useState } from "react";
import { Field, Input, Select, Textarea, Button } from "@/components/ui";
import { createOrder } from "@/app/actions";
import { localAmount, usd } from "@/lib/utils";
import { DELIVERY_CURRENCIES, type ExchangeRate } from "@/lib/types";

export function OrderForm({
  rates,
  onDone,
}: {
  rates: ExchangeRate[];
  onDone?: () => void;
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
          min="0"
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
          <p className="text-xs text-muted-foreground">Tu familia recibe (aprox.)</p>
          <p className="text-lg font-bold text-foreground">
            {localAmount(receives)} {currency}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Por {usd(amountNum)} · el monto final lo confirma el negocio.
          </p>
        </div>
      )}

      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          ¿Quién recibe en Cuba?
        </p>
        <Field label="Nombre del beneficiario">
          <Input name="beneficiary_name" placeholder="Nombre de quien recibe" required />
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input name="beneficiary_phone" inputMode="tel" placeholder="+53…" />
          </Field>
          <Field label="Provincia">
            <Input name="province" placeholder="Ej: La Habana" />
          </Field>
        </div>
      </div>

      <Field label="Nota (opcional)">
        <Textarea name="note" rows={2} placeholder="Algún detalle para el negocio…" />
      </Field>

      <Button type="submit" className="w-full">
        Enviar pedido
      </Button>
    </form>
  );
}
