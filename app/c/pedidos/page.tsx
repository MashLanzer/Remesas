import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMyOrders } from "@/lib/data";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MisPedidosPage() {
  const orders = await getMyOrders();

  return (
    <div>
      <Link
        href="/c"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>
      <PageHeader title="Mis pedidos" subtitle="El estado de tus envíos" />

      {orders.length === 0 ? (
        <EmptyState
          title="Aún no has pedido"
          description="Cuando pidas una remesa, aquí verás su estado."
        />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Card key={o.id} className="space-y-2 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {o.beneficiary_name || "Beneficiario"}
                    {o.province ? ` · ${o.province}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${Number(o.amount_usd)}
                    {o.delivery_currency ? ` · ${o.delivery_currency}` : ""} ·{" "}
                    {formatDate(o.created_at.slice(0, 10))}
                  </p>
                </div>
                <OrderStatusBadge status={o.status} />
              </div>
              {o.status === "pendiente" && <CancelOrderButton id={o.id} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
