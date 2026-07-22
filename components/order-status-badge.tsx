import type { OrderStatus } from "@/lib/types";

const MAP: Record<OrderStatus, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-warning/10 text-warning" },
  aceptado: { label: "Aceptado", cls: "bg-income/10 text-income" },
  rechazado: { label: "Rechazado", cls: "bg-destructive/10 text-destructive" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = MAP[status] ?? MAP.pendiente;
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
