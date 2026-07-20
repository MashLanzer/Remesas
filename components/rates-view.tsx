"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Card, Input } from "@/components/ui";
import { upsertRate } from "@/app/actions";
import { formatDate } from "@/lib/utils";
import { DELIVERY_CURRENCIES, type ExchangeRate } from "@/lib/types";

export function RatesView({ rates }: { rates: ExchangeRate[] }) {
  const byCurrency: Record<string, ExchangeRate | undefined> = {};
  for (const r of rates) byCurrency[r.currency] = r;

  return (
    <div className="space-y-2">
      {DELIVERY_CURRENCIES.map((c) => (
        <RateRow key={c} currency={c} rate={byCurrency[c]} />
      ))}
      <p className="pt-2 text-center text-xs text-muted-foreground">
        1 USD = tasa · unidades locales. Ajústala al mercado del día.
      </p>
    </div>
  );
}

function RateRow({
  currency,
  rate,
}: {
  currency: string;
  rate?: ExchangeRate;
}) {
  const [pending, start] = useTransition();
  return (
    <Card className="p-3.5">
      <form
        action={(fd) => start(() => upsertRate(fd))}
        className="flex items-center gap-3"
      >
        <input type="hidden" name="currency" value={currency} />
        <div className="w-16">
          <p className="text-sm font-semibold text-foreground">{currency}</p>
          <p className="text-[10px] text-muted-foreground">
            {rate ? formatDate(rate.updated_at) : "nueva"}
          </p>
        </div>
        <Input
          type="number"
          name="rate"
          step="0.0001"
          min="0"
          defaultValue={rate ? String(rate.rate) : ""}
          className="flex-1"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
          aria-label="Guardar tasa"
        >
          <Check className="h-4 w-4" />
        </button>
      </form>
    </Card>
  );
}
