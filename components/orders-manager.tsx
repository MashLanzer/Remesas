"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  User,
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  Search,
  ArrowDownUp,
  AlertTriangle,
} from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { acceptOrder, rejectOrder, cancelAcceptedOrder } from "@/app/actions";
import { usd, formatDate, cn } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { useDialog } from "@/components/confirm";

const STALE_HOURS = 12;

const QUICK_REASONS = [
  "Provincia no cubierta",
  "Falta información",
  "Monto fuera de rango",
  "No disponible ahora",
];

function agoLabel(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${Math.max(mins, 1)} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d > 1 ? "s" : ""}`;
}

export function OrdersManager({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const { confirm } = useDialog();

  // "Ahora" se fija tras montar para evitar desajustes de hidratación.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  // Rechazo con motivo opcional.
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [reason, setReason] = useState("");

  // Búsqueda / filtro en procesados.
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Orden de los pendientes.
  const [sortBy, setSortBy] = useState<"antiguo" | "reciente" | "monto">(
    "antiguo"
  );

  const pendientesRaw = orders.filter((o) => o.status === "pendiente");
  const resto = orders.filter((o) => o.status !== "pendiente");

  const pendientes = useMemo(() => {
    const list = [...pendientesRaw];
    if (sortBy === "monto")
      list.sort((a, b) => Number(b.amount_usd) - Number(a.amount_usd));
    else
      list.sort((a, b) =>
        sortBy === "antiguo"
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at)
      );
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendientesRaw, sortBy]);

  // Posibles duplicados: mismo cliente + monto + beneficiario entre pendientes.
  const dupIds = useMemo(() => {
    const seen = new Map<string, string>();
    const dups = new Set<string>();
    for (const o of pendientesRaw) {
      const key = `${o.client_id || o.client_name}|${o.amount_usd}|${
        o.beneficiary_name || ""
      }`;
      const first = seen.get(key);
      if (first) {
        dups.add(o.id);
        dups.add(first);
      } else seen.set(key, o.id);
    }
    return dups;
  }, [pendientesRaw]);

  const restoStatuses = useMemo(
    () => Array.from(new Set(resto.map((o) => o.status))),
    [resto]
  );
  const filteredResto = useMemo(() => {
    const t = q.trim().toLowerCase();
    return resto.filter(
      (o) =>
        (!statusFilter || o.status === statusFilter) &&
        (!t ||
          (o.client_name || "").toLowerCase().includes(t) ||
          (o.beneficiary_name || "").toLowerCase().includes(t))
    );
  }, [resto, q, statusFilter]);

  function act(id: string, fn: (id: string) => Promise<void>) {
    setBusy(id);
    start(async () => {
      await fn(id);
      setBusy(null);
    });
  }

  function doReject() {
    const o = rejecting;
    if (!o) return;
    setBusy(o.id);
    const r = reason.trim() || undefined;
    start(async () => {
      await rejectOrder(o.id, r);
      setBusy(null);
      setRejecting(null);
      setReason("");
    });
  }

  // Aceptar y abrir la remesa creada para revisar/ajustar.
  function doAccept(o: Order) {
    setBusy(o.id);
    start(async () => {
      const rid = await acceptOrder(o.id);
      setBusy(null);
      if (typeof rid === "string") router.push(`/remesas/${rid}`);
    });
  }

  function waHref(o: Order): string | null {
    const digits = o.client_phone?.replace(/\D/g, "");
    if (!digits) return null;
    const msg = `Hola ${o.client_name || ""}, sobre tu pedido de ${usd(
      Number(o.amount_usd)
    )} para ${o.beneficiary_name || "tu familiar"}:`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pendientes ({pendientes.length})
          </h2>
          {pendientes.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setSortBy((s) =>
                  s === "antiguo"
                    ? "reciente"
                    : s === "reciente"
                    ? "monto"
                    : "antiguo"
                )
              }
              className="flex items-center gap-1 text-[11px] font-semibold text-primary transition active:scale-95"
            >
              <ArrowDownUp className="h-3 w-3" />
              {sortBy === "antiguo"
                ? "Más antiguos"
                : sortBy === "reciente"
                ? "Más recientes"
                : "Mayor monto"}
            </button>
          )}
        </div>
        {pendientes.length === 0 ? (
          <EmptyState
            title="Sin pedidos nuevos"
            description="Cuando un cliente pida una remesa, aparecerá aquí."
          />
        ) : (
          <div className="space-y-2">
            {pendientes.map((o) => {
              const stale =
                now != null &&
                (now - new Date(o.created_at).getTime()) / 3600000 >=
                  STALE_HOURS;
              const wa = waHref(o);
              return (
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
                      <p
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          stale ? "font-medium text-warning" : "text-muted-foreground"
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {now != null
                          ? agoLabel(o.created_at, now)
                          : formatDate(o.created_at.slice(0, 10))}
                        {stale ? " · sin responder" : ""}
                      </p>
                    </div>
                    <OrderStatusBadge order={o} />
                  </div>

                  {dupIds.has(o.id) && (
                    <p className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-warning">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Posible duplicado (mismo cliente, monto y beneficiario)
                    </p>
                  )}

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
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="WhatsApp al cliente"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-income/10 text-income transition active:scale-95"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setReason("");
                        setRejecting(o);
                      }}
                      disabled={busy === o.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm font-semibold text-destructive transition active:scale-[0.98] disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> Rechazar
                    </button>
                    <button
                      onClick={() => doAccept(o)}
                      disabled={busy === o.id}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> Aceptar
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {resto.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Procesados ({resto.length})
          </h2>

          {/* Búsqueda / filtro */}
          {resto.length > 3 && (
            <div className="mb-3 space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por cliente o beneficiario"
                  className="w-full bg-transparent text-sm text-foreground outline-none"
                />
              </div>
              {restoStatuses.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Chip
                    active={!statusFilter}
                    onClick={() => setStatusFilter("")}
                    label="Todos"
                  />
                  {restoStatuses.map((s) => (
                    <Chip
                      key={s}
                      active={statusFilter === s}
                      onClick={() => setStatusFilter(s)}
                      label={s}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredResto.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sin resultados.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredResto.map((o) => (
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
                  {o.status === "rechazado" && o.reject_reason && (
                    <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                      Motivo: {o.reject_reason}
                    </p>
                  )}
                  {o.status === "aceptado" && (
                    <div className="flex gap-2">
                      {o.remittance_id && (
                        <Link
                          href={`/remesas/${o.remittance_id}`}
                          className="flex flex-1 items-center justify-center rounded-xl border border-border py-2 text-xs font-semibold text-foreground transition active:scale-[0.98]"
                        >
                          Ver remesa
                        </Link>
                      )}
                      <button
                        onClick={async () => {
                          if (
                            await confirm({
                              title: "Cancelar pedido",
                              message:
                                "Se borrará la remesa vinculada y el cliente dejará de ver el envío.",
                              confirmLabel: "Sí, cancelar",
                            })
                          )
                            act(o.id, cancelAcceptedOrder);
                        }}
                        disabled={busy === o.id}
                        className="flex-1 rounded-xl border border-border py-2 text-xs font-semibold text-destructive transition active:scale-[0.98] disabled:opacity-50"
                      >
                        Cancelar pedido
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Hoja: rechazar con motivo */}
      <Sheet
        open={!!rejecting}
        onClose={() => {
          setRejecting(null);
          setReason("");
        }}
        title="Rechazar pedido"
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Puedes añadir un motivo (opcional). El cliente lo verá en su pedido.
        </p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition active:scale-95",
                reason === r
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ej: No cubrimos esa provincia ahora mismo."
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setRejecting(null);
              setReason("");
            }}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            onClick={doReject}
            disabled={!!rejecting && busy === rejecting.id}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            <X className="h-4 w-4" /> Rechazar
          </button>
        </div>
      </Sheet>
    </div>
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
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground"
      )}
    >
      {label}
    </button>
  );
}
