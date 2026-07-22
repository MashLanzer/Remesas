"use client";

import { useState, useTransition } from "react";
import { Check, X, User, MapPin, Phone, Truck } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { acceptStoreOrder, rejectStoreOrder, markStoreDelivered } from "@/app/actions";
import { usd, formatDate } from "@/lib/utils";
import type { StoreOrder } from "@/lib/types";

export function StoreOrdersManager({ orders }: { orders: StoreOrder[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const pendientes = orders.filter((o) => o.status === "pendiente");
  const activos = orders.filter(
    (o) => o.status === "aceptado" && !o.delivered_at
  );
  const resto = orders.filter(
    (o) => o.status === "rechazado" || (o.status === "aceptado" && o.delivered_at)
  );

  function act(id: string, fn: (id: string) => Promise<void>) {
    setBusy(id);
    start(async () => {
      await fn(id);
      setBusy(null);
    });
  }

  function detail(o: StoreOrder) {
    return (
      <div className="space-y-1 rounded-xl bg-muted/50 p-3 text-sm">
        <p className="flex items-center gap-2 text-foreground">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">Cliente:</span> {o.client_name || "—"}
          {o.client_phone ? ` · ${o.client_phone}` : ""}
        </p>
        <p className="flex items-center gap-2 text-foreground">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">Entregar a:</span>{" "}
          {o.recipient_name || "—"}
          {o.address ? ` · ${o.address}` : ""}
        </p>
        {o.recipient_phone && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {o.recipient_phone}
          </p>
        )}
        {o.note && (
          <p className="border-t border-border pt-1 text-muted-foreground">
            “{o.note}”
          </p>
        )}
      </div>
    );
  }

  function head(o: StoreOrder) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            {o.qty}× {o.product_name || "Producto"}
          </p>
          <p className="text-xs text-muted-foreground">
            {usd(Number(o.total_usd))} · {formatDate(o.created_at.slice(0, 10))}
          </p>
        </div>
        <OrderStatusBadge order={o} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nuevos ({pendientes.length})
        </h2>
        {pendientes.length === 0 ? (
          <EmptyState
            title="Sin pedidos de tienda"
            description="Cuando un cliente pida un producto, aparecerá aquí."
          />
        ) : (
          <div className="space-y-2">
            {pendientes.map((o) => (
              <Card key={o.id} className="space-y-3 p-3.5">
                {head(o)}
                {detail(o)}
                <div className="flex gap-2">
                  <button
                    onClick={() => act(o.id, rejectStoreOrder)}
                    disabled={busy === o.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-semibold text-destructive transition active:scale-[0.98] disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Rechazar
                  </button>
                  <button
                    onClick={() => act(o.id, acceptStoreOrder)}
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

      {activos.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Por entregar ({activos.length})
          </h2>
          <div className="space-y-2">
            {activos.map((o) => (
              <Card key={o.id} className="space-y-3 p-3.5">
                {head(o)}
                {detail(o)}
                <button
                  onClick={() => act(o.id, markStoreDelivered)}
                  disabled={busy === o.id}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-income py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
                >
                  <Truck className="h-4 w-4" /> Marcar entregado
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {resto.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Historial
          </h2>
          <div className="space-y-2">
            {resto.map((o) => (
              <Card key={o.id} className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {o.qty}× {o.product_name || "Producto"} · {usd(Number(o.total_usd))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.recipient_name || "—"} ·{" "}
                    {formatDate(o.created_at.slice(0, 10))}
                  </p>
                </div>
                <OrderStatusBadge order={o} />
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
