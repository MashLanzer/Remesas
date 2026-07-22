type Display =
  | "pendiente"
  | "en_reparto"
  | "entregado"
  | "recibido"
  | "rechazado";

type OrderLike = {
  status: string;
  accepted_at?: string | null;
  delivered_at?: string | null;
  received_at?: string | null;
};

const MAP: Record<Display, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-warning/10 text-warning" },
  en_reparto: { label: "En reparto", cls: "bg-info/10 text-info" },
  entregado: { label: "Entregado", cls: "bg-income/10 text-income" },
  recibido: { label: "Recibido", cls: "bg-income/10 text-income" },
  rechazado: { label: "Rechazado", cls: "bg-destructive/10 text-destructive" },
};

// Estado a mostrar: combina el estado del pedido con las marcas de tiempo del
// seguimiento (aceptado → en reparto → entregado → recibido).
export function orderDisplay(o: OrderLike): Display {
  if (o.status === "rechazado") return "rechazado";
  if (o.received_at) return "recibido";
  if (o.delivered_at) return "entregado";
  if (o.status === "aceptado" || o.accepted_at) return "en_reparto";
  return "pendiente";
}

export function OrderStatusBadge({ order }: { order: OrderLike }) {
  const m = MAP[orderDisplay(order)];
  return (
    <span
      className={
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold " + m.cls
      }
    >
      {m.label}
    </span>
  );
}
