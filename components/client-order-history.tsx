"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui";
import {
  OrderStatusBadge,
  orderDisplay,
} from "@/components/order-status-badge";
import { usd, cn } from "@/lib/utils";
import type { Order } from "@/lib/types";

export function ClientOrderHistory({ orders }: { orders: Order[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todos" | "entregadas" | "rechazadas">(
    "todos"
  );

  const hasRejected = orders.some((o) => orderDisplay(o) === "rechazado");
  const hasDelivered = orders.some((o) => {
    const d = orderDisplay(o);
    return d === "entregado" || d === "recibido";
  });
  const showControls = orders.length > 4;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return orders.filter((o) => {
      const d = orderDisplay(o);
      if (filter === "rechazadas" && d !== "rechazado") return false;
      if (
        filter === "entregadas" &&
        d !== "entregado" &&
        d !== "recibido"
      )
        return false;
      if (t && !(o.beneficiary_name || "").toLowerCase().includes(t))
        return false;
      return true;
    });
  }, [orders, q, filter]);

  // Agrupado por mes (los pedidos ya vienen del más reciente al más antiguo).
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: Order[] }>();
    for (const o of filtered) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map.has(key)) {
        const l = d.toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        });
        map.set(key, { label: l.charAt(0).toUpperCase() + l.slice(1), items: [] });
      }
      map.get(key)!.items.push(o);
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Historial
      </h2>

      {showControls && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por beneficiario"
              className="w-full bg-transparent text-sm text-foreground outline-none"
            />
          </div>
          {hasRejected && hasDelivered && (
            <div className="flex gap-2">
              <Chip active={filter === "todos"} onClick={() => setFilter("todos")} label="Todos" />
              <Chip
                active={filter === "entregadas"}
                onClick={() => setFilter("entregadas")}
                label="Entregadas"
              />
              <Chip
                active={filter === "rechazadas"}
                onClick={() => setFilter("rechazadas")}
                label="Rechazadas"
              />
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sin resultados.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g.label}
              </p>
              <div className="space-y-2">
                {g.items.map((o) => (
                  <Card key={o.id} className="space-y-2 p-3.5">
                    <Link
                      href={`/c/pedidos/${o.id}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {usd(Number(o.amount_usd))}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            · {o.beneficiary_name || "—"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <OrderStatusBadge order={o} />
                    </Link>
                    {o.status === "rechazado" && o.reject_reason && (
                      <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                        Motivo: {o.reject_reason}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground"
      )}
    >
      {label}
    </button>
  );
}
