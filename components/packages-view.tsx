"use client";

import { useState } from "react";
import { Gift, Send } from "lucide-react";
import { Card, Button, Field, Input, Textarea, EmptyState } from "@/components/ui";
import { IlluStore } from "@/components/illustrations";
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
        illustration={<IlluStore />}
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
        const showReceives =
          receives != null && p.delivery_currency && p.delivery_currency !== "USD";
        return (
          <Card
            key={p.id}
            className={
              "space-y-3 p-4 " +
              (p.highlight ? "border-primary/30 ring-1 ring-primary/15" : "")
            }
          >
            {/* Encabezado: emoji grande + título + badge */}
            <div className="flex items-start gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                {p.emoji || "🎁"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-base font-bold text-foreground">{p.title}</p>
                  {p.highlight && (
                    <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {p.highlight}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.description}
                  </p>
                )}
              </div>
            </div>

            {/* Pagas → Recibe, bien claro */}
            <div className="flex items-stretch gap-2 rounded-2xl bg-muted/60 p-1">
              <div className="flex-1 rounded-xl px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pagas
                </p>
                <p className="tabular text-lg font-extrabold text-foreground">
                  {usd(Number(p.amount_usd))}
                </p>
              </div>
              <div className="flex items-center text-muted-foreground">→</div>
              <div className="flex-1 rounded-xl bg-primary/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Recibe
                </p>
                <p className="tabular text-lg font-extrabold text-primary">
                  {showReceives ? (
                    <>
                      {localAmount(receives!)}{" "}
                      <span className="text-xs font-bold">{p.delivery_currency}</span>
                    </>
                  ) : (
                    usd(Number(p.amount_usd))
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelected(p)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              <Send className="h-4 w-4" /> Pedir este paquete
            </button>
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
