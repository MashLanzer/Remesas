"use client";

import { useMemo, useState } from "react";
import { Gift, Send } from "lucide-react";
import { Card, Button, Field, Input, Textarea, EmptyState } from "@/components/ui";
import { IlluStore } from "@/components/illustrations";
import { Sheet } from "@/components/sheet";
import { createOrder } from "@/app/actions";
import { usd, localAmount, packageQuote, deliveryOptions } from "@/lib/utils";
import { convertDelivered, type CommissionRules } from "@/lib/calc";
import type { DeliveryMethod, ExchangeRate, RemittancePackage } from "@/lib/types";

// Etiqueta bonita (con emoji) para una forma de entrega en el switch.
const CURRENCY_EMOJI: Record<string, string> = {
  USD: "💵",
  CUP: "💴",
  MLC: "💳",
  EUR: "💶",
};
function optionLabel(currency: string, method: DeliveryMethod): string {
  const emoji = method === "transferencia" ? "🏦" : CURRENCY_EMOJI[currency] || "💰";
  if (currency === "CUP") {
    return `${emoji} CUP ${method === "transferencia" ? "transferencia" : "efectivo"}`;
  }
  return `${emoji} ${currency}`;
}
// Formatea un monto en su moneda (USD con símbolo; el resto con miles + código).
function fmtAmount(amount: number, currency: string): string {
  return currency === "USD"
    ? usd(amount)
    : `${localAmount(amount)} ${currency}`;
}

export function PackagesView({
  packages,
  rates,
  rules,
  transferBonusPct,
}: {
  packages: RemittancePackage[];
  rates: ExchangeRate[];
  rules?: CommissionRules;
  transferBonusPct?: number | null;
}) {
  const [selected, setSelected] = useState<RemittancePackage | null>(null);

  const fx = (p: RemittancePackage) =>
    p.pricing_mode === "fixed"
      ? { send_usd: p.fixed_send_usd, receives: p.fixed_receives }
      : null;

  // Formas de entrega disponibles en la tienda (moneda + efectivo/transferencia).
  // Se calculan una vez con las tasas activas; el monto de cada tarjeta se
  // convierte luego según su propio USD entregado. Sesgamos a CUP primero.
  const options = useMemo(
    () =>
      deliveryOptions(1, "CUP", rates, transferBonusPct).map((o) => ({
        key: o.key,
        currency: o.currency,
        method: o.method,
        label: optionLabel(o.currency, o.method),
      })),
    [rates, transferBonusPct]
  );
  const [selKey, setSelKey] = useState<string>(options[0]?.key ?? "USD-efectivo");
  const sel = options.find((o) => o.key === selKey) ?? options[0];

  if (packages.length === 0) {
    return (
      <EmptyState
        illustration={<IlluStore />}
        title="Sin paquetes por ahora"
        description="Cuando el negocio publique paquetes, aparecerán aquí. Mientras tanto, usa el botón central para enviar una remesa a tu medida."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Switch global: el cliente ve el monto en la moneda/forma que quiera. */}
      {options.length > 1 && sel && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Ver montos en
          </p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {options.map((o) => (
              <button
                key={o.key}
                onClick={() => setSelKey(o.key)}
                className={
                  "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition active:scale-95 " +
                  (o.key === sel.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground")
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {packages.map((p) => {
        const q = packageQuote(
          p.amount_usd,
          p.delivery_currency,
          rates,
          rules,
          fx(p),
          transferBonusPct
        );
        const isFixed = p.pricing_mode === "fixed";
        // Precio fijo: el número del operador manda, no cambia con el switch.
        // Automático: se convierte el USD entregado a la forma seleccionada.
        const amount = isFixed
          ? q.receives
          : sel
          ? convertDelivered(q.deliveredUsd, sel.currency, sel.method, rates, transferBonusPct)
          : q.receives;
        const amountCurrency = isFixed
          ? p.delivery_currency || "USD"
          : sel?.currency || p.delivery_currency || "USD";
        return (
          <Card
            key={p.id}
            className={
              "overflow-hidden p-0 " +
              (p.highlight ? "border-primary/30 ring-1 ring-primary/15" : "")
            }
          >
            {p.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.image_url}
                alt={p.title}
                className="h-36 w-full object-cover"
              />
            )}
            <div className="space-y-3 p-4">
              {/* Encabezado: emoji grande + título + badge */}
              <div className="flex items-start gap-3">
                {!p.image_url && (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                    {p.emoji || "🎁"}
                  </span>
                )}
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
                    {isFixed && (
                      <span className="ml-1 normal-case text-muted-foreground">
                        (fijo)
                      </span>
                    )}
                  </p>
                  <p className="tabular text-lg font-extrabold text-primary">
                    {amount != null ? (
                      amountCurrency === "USD" ? (
                        usd(amount)
                      ) : (
                        <>
                          {localAmount(amount)}{" "}
                          <span className="text-xs font-bold">{amountCurrency}</span>
                        </>
                      )
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
            </div>
          </Card>
        );
      })}

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
      >
        {selected &&
          (() => {
            const q = packageQuote(
              selected.amount_usd,
              selected.delivery_currency,
              rates,
              rules,
              fx(selected),
              transferBonusPct
            );
            const isFixed = selected.pricing_mode === "fixed";
            const breakdown = isFixed
              ? []
              : deliveryOptions(
                  q.deliveredUsd,
                  selected.delivery_currency,
                  rates,
                  transferBonusPct
                );
            return (
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

                  {/* Desglose: todas las formas en que la familia puede recibir. */}
                  {isFixed ? (
                    q.receives != null && (
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Tu familia recibe
                        </span>
                        <span className="tabular text-sm font-bold text-income">
                          {fmtAmount(q.receives, selected.delivery_currency || "USD")}
                        </span>
                      </div>
                    )
                  ) : breakdown.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Tu familia puede recibir
                      </p>
                      {breakdown.map((o) => (
                        <div
                          key={o.key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-muted-foreground">
                            {optionLabel(o.currency, o.method)}
                          </span>
                          <span className="tabular text-sm font-bold text-income">
                            {fmtAmount(o.amount, o.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Calculado a la tasa de hoy. El monto final lo confirma el
                    negocio al aceptar.
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
            );
          })()}
      </Sheet>
    </div>
  );
}
