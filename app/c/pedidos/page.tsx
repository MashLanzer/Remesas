import { getMyOrders } from "@/lib/data";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { OrderTimeline } from "@/components/order-timeline";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { ShareTrackButton } from "@/components/share-track-button";
import { usd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MisPedidosPage() {
  const orders = await getMyOrders();

  return (
    <div>
      <PageHeader title="Mis pedidos" subtitle="Sigue el estado de tus envíos" />

      {orders.length === 0 ? (
        <EmptyState
          title="Aún no has pedido"
          description="Cuando pidas una remesa, aquí verás su estado en vivo."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {usd(Number(o.amount_usd))}
                    {o.delivery_currency ? (
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        en {o.delivery_currency}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Para {o.beneficiary_name || "—"}
                    {o.province ? ` · ${o.province}` : ""}
                  </p>
                  {o.discount_usd ? (
                    <p className="mt-0.5 text-xs font-semibold text-income">
                      🎁 Descuento por puntos: −{usd(Number(o.discount_usd))}
                    </p>
                  ) : o.redeem && o.status === "pendiente" ? (
                    <p className="mt-0.5 text-xs text-primary">
                      Pediste usar tus puntos
                    </p>
                  ) : null}
                </div>
                <OrderStatusBadge order={o} />
              </div>

              <div className="border-t border-border pt-3">
                <OrderTimeline
                  status={o.status}
                  created_at={o.created_at}
                  accepted_at={o.accepted_at}
                  delivered_at={o.delivered_at}
                  received_at={o.received_at}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {o.status === "aceptado" && o.track_token && (
                  <ShareTrackButton token={o.track_token} />
                )}
                {o.status === "pendiente" && <CancelOrderButton id={o.id} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
