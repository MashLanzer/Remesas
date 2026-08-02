import { Clock, Truck, CheckCircle2, Hourglass } from "lucide-react";
import { orderDisplay } from "@/components/order-status-badge";
import { relativeTime, formatDate } from "@/lib/utils";
import type { Order } from "@/lib/types";

// Línea de "¿cuándo llega?": mensaje honesto según el estado, con el tiempo
// transcurrido real (sin inventar números). Reduce la ansiedad del cliente.
export function OrderEta({ order, className }: { order: Order; className?: string }) {
  const d = orderDisplay(order);
  let Icon = Clock;
  let text = "";
  let tone = "text-muted-foreground";

  if (d === "pendiente") {
    Icon = Hourglass;
    text = `Esperando que el negocio la acepte · pedido ${relativeTime(
      order.created_at
    )}`;
    tone = "text-info";
  } else if (d === "en_reparto") {
    Icon = Truck;
    text = order.accepted_at
      ? `En camino a tu familia · aceptado ${relativeTime(order.accepted_at)}`
      : "En camino a tu familia";
    tone = "text-primary";
  } else if (d === "entregado" || d === "recibido") {
    Icon = CheckCircle2;
    text = `Entregado ${
      order.delivered_at ? formatDate(order.delivered_at) : ""
    }`.trim();
    tone = "text-income";
  } else {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${tone} ${className ?? ""}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 truncate">{text}</span>
    </div>
  );
}
