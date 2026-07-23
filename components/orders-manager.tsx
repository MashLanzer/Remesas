"use client";

import { useState, useTransition } from "react";
import { Check, X, User, MapPin, Phone } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { acceptOrder, rejectOrder, cancelAcceptedOrder } from "@/app/actions";
import { usd, formatDate } from "@/lib/utils";
import type { Order } from "@/lib/types";

export function OrdersManager({ orders }: { orders: Order[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const pendientes = orders.filter((o) => o.status === "pendiente");
  const resto = orders.filter((o) => o.status !== "pendiente");

  function act(id: string, fn: (id: string) => Promise<void>) {
    setBusy(id);
    start(async () => {
      await fn(id);
      setBusy(null);
    });
  }

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pendientes ({pendientes.length})
        </h2>
        {pendientes.length === 0 ? (
          <EmptyState
            title="Sin pedidos nuevos"
            description="Cuando un cliente pida una remesa, aparecerá aquí."
          />
        ) : (
          <div className="space-y-2">
            {pendientes.map((o) => (
              <Card key={o.id} className="space-y-3 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-foreground">
                      {usd(Number(o.amount_usd))}
                      {o.delivery_currency ? (
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          en {o.delivery_currency}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(o.created_at.slice(0, 10))}
                    </p>
                  </div>
                  <OrderStatusBadge order={o} />
                </div>

                <div className="space-y-1 rounded-xl bg-muted/50 p-3 text-sm">
                  <p className="flex items-center gap-2 text-foreground">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">Cliente:</span>{" "}
                    {o.client_name || "—"}
                    {o.client_phone ? ` · ${o.client_phone}` : ""}
                  </p>
                  <p className="flex items-center gap-2 text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">Recibe:</span>{" "}
                    {o.beneficiary_name || "—"}
                    {o.province ? ` · ${o.province}` : ""}
                  </p>
                  {o.beneficiary_phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {o.beneficiary_phone}
                    </p>
                  )}
                  {o.note && (
                    <p className="border-t border-border pt-1 text-muted-foreground">
                      “{o.note}”
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => act(o.id, rejectOrder)}
                    disabled={busy === o.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-semibold text-destructive transition active:scale-[0.98] disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Rechazar
                  </button>
                  <button
                    onClick={() => act(o.id, acceptOrder)}
                    disabled={busy === o.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Aceptar
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {resto.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Procesados
          </h2>
          <div className="space-y-2">
            {resto.map((o) => (
              <Card key={o.id} className="space-y-2.5 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {usd(Number(o.amount_usd))} · {o.beneficiary_name || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.client_name || "—"} ·{" "}
                      {formatDate(o.created_at.slice(0, 10))}
                    </p>
                  </div>
                  <OrderStatusBadge order={o} />
                </div>
                {o.status === "aceptado" && (
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "¿Cancelar este pedido? Se borrará la remesa vinculada y el cliente dejará de ver el envío."
                        )
                      )
                        act(o.id, cancelAcceptedOrder);
                    }}
                    disabled={busy === o.id}
                    className="w-full rounded-xl border border-border py-2 text-xs font-semibold text-destructive transition active:scale-[0.98] disabled:opacity-50"
                  >
                    Cancelar pedido
                  </button>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
