"use client";

import { useState } from "react";
import { Gift, Send } from "lucide-react";
import { Card, Button, Field, Input, Textarea, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { createOrder } from "@/app/actions";
import { usd, localAmount, packageReceives } from "@/lib/utils";
import type { ExchangeRate, RemittancePackage } from "@/lib/types";

export function PackagesView({
  packages,
  rates,
}: {
  packages: RemittancePackage[];
  rates: ExchangeRate[];
}) {
  const [selected, setSelected] = useState<RemittancePackage | null>(null);

  if (packages.length === 0) {
    return (
      <EmptyState
        title="Sin paquetes por ahora"
        description="Cuando el negocio publique paquetes, aparecerán aquí. Mientras tanto, usa el botón central para enviar una remesa a tu medida."
      />
    );
  }

  const selReceives = selected
    ? packageReceives(selected.amount_usd, selected.delivery_currency, rates)
    : null;

  return (
    <div className="space-y-3">
      {packages.map((p) => {
        const receives = packageReceives(p.amount_usd, p.delivery_currency, rates);
        return (
          <Card key={p.id} className="flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
              {p.emoji || "🎁"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">{p.title}</p>
                {p.highlight && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {p.highlight}
                  </span>
                )}
              </div>
              {receives != null && p.delivery_currency !== "USD" && (
                <p className="mt-0.5 text-sm font-semibold text-income">
                  Recibe ~{localAmount(receives)} {p.delivery_currency}
                </p>
              )}
              {p.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {p.description}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="tabular text-sm font-bold text-foreground">
                  {usd(Number(p.amount_usd))}
                  {p.delivery_currency ? (
                    <span className="ml-1 text-xs font-medium text-muted-foreground">
                      en {p.delivery_currency}
                    </span>
                  ) : null}
                </span>
                <button
                  onClick={() => setSelected(p)}
                  className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition active:scale-95"
                >
                  Pedir
                </button>
              </div>
            </div>
          </Card>
        );
      })}

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
      >
        {selected && (
          <form action={createOrder} className="space-y-3">
            <input type="hidden" name="package_id" value={selected.id} />

            <div className="rounded-xl bg-muted p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gift className="h-4 w-4 text-primary" />
                  Pagas
                </span>
                <span className="tabular text-sm font-bold text-foreground">
                  {usd(Number(selected.amount_usd))}
                </span>
              </div>
              {selReceives != null && selected.delivery_currency !== "USD" && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Tu familia recibe ~
                  </span>
                  <span className="tabular text-sm font-bold text-income">
                    {localAmount(selReceives)} {selected.delivery_currency}
                  </span>
                </div>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Calculado a la tasa de hoy. El monto final lo confirma el negocio
                al aceptar.
              </p>
            </div>

            <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ¿Quién recibe en Cuba?
            </p>
            <Field label="Nombre del beneficiario">
              <Input
                name="beneficiary_name"
                placeholder="Nombre de quien recibe"
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono">
                <Input name="beneficiary_phone" inputMode="tel" placeholder="+53…" />
              </Field>
              <Field label="Provincia">
                <Input name="province" placeholder="Ej: La Habana" />
              </Field>
            </div>
            <Field label="Nota (opcional)">
              <Textarea name="note" rows={2} placeholder="Algún detalle para el negocio…" />
            </Field>

            <Button type="submit" className="w-full">
              <Send className="h-4 w-4" /> Pedir por {usd(Number(selected.amount_usd))}
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
