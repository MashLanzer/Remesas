import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { localAmount } from "@/lib/utils";
import { transferFactor } from "@/lib/calc";
import { OrderEta } from "@/components/order-eta";
import type { Order } from "@/lib/types";

// Tarjeta destacada del envío en curso, con mini-seguimiento horizontal.
export function ActiveOrderCard({
  order,
  rate,
  stage,
  transferBonusPct,
}: {
  order: Order;
  rate: number;
  stage: 1 | 2; // 1 = pendiente, 2 = en reparto
  transferBonusPct?: number | null;
}) {
  const isTransfer =
    order.delivery_currency === "CUP" &&
    order.delivery_method === "transferencia";
  const effRate = isTransfer
    ? Number(rate) * transferFactor(transferBonusPct)
    : Number(rate);
  const receives = Number(order.amount_usd) * effRate;
  const steps = ["Pedido", "En reparto", "Entregado"];

  return (
    <Link href={`/c/pedidos/${order.id}`} className="block">
      <Card className="space-y-3 border-primary/20 bg-primary/5 transition active:scale-[0.99]">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            Tu envío en curso
          </p>
          <OrderStatusBadge order={order} />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {Number(rate) > 0 && (
              <p className="tabular text-xl font-extrabold text-foreground">
                {localAmount(receives)}{" "}
                <span className="text-sm font-semibold text-muted-foreground">
                  {order.delivery_currency}
                </span>
                {isTransfer && (
                  <span className="ml-1 text-xs font-semibold text-primary">
                    🏦 transferencia
                  </span>
                )}
              </p>
            )}
            <p className="truncate text-xs text-muted-foreground">
              para {order.beneficiary_name || "tu familia"}
            </p>
            <OrderEta order={order} className="mt-1" />
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
        </div>

        {/* Mini-seguimiento */}
        <div className="flex items-center">
          {steps.map((label, i) => {
            const done = i < stage;
            const active = i === stage - 1;
            return (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <span
                    className={
                      "h-2.5 w-2.5 rounded-full " +
                      (done
                        ? active
                          ? "animate-pulse bg-primary ring-2 ring-primary/30"
                          : "bg-primary"
                        : "bg-muted")
                    }
                  />
                  <span
                    className={
                      "mt-1 text-[9px] font-medium " +
                      (done ? "text-primary" : "text-muted-foreground")
                    }
                  >
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <span
                    className={
                      "mx-1 h-0.5 flex-1 rounded-full " +
                      (i < stage - 1 ? "bg-primary/50" : "bg-muted")
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </Link>
  );
}
