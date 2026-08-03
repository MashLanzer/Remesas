"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  Users,
  RotateCcw,
  Share2,
  Bell,
  CheckSquare,
  Coins,
  MessageSquare,
  Receipt,
} from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { IlluOrders } from "@/components/illustrations";
import { Sheet } from "@/components/sheet";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { OrderChat } from "@/components/order-chat";
import { getUnreadOrderCounts } from "@/app/actions";
import {
  acceptOrder,
  rejectOrder,
  cancelAcceptedOrder,
  restoreOrderToPending,
} from "@/app/actions";
import { usd, localAmount, formatDate, cn } from "@/lib/utils";
import { transferFactor } from "@/lib/calc";
import type { Order, ExchangeRate } from "@/lib/types";
import { useDialog } from "@/components/confirm";

const STALE_HOURS = 12;
const POLL_MS = 45000;

const QUICK_REASONS = [
  "Provincia no cubierta",
  "Falta información",
  "Monto fuera de rango",
  "No disponible ahora",
];

type Rep = { id: string; name: string; coverage?: string[] };

function agoLabel(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${Math.max(mins, 1)} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d > 1 ? "s" : ""}`;
}

function durationLabel(fromIso: string, toIso: string): string | null {
  const diff = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (diff < 0) return null;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} día${d > 1 ? "s" : ""}`;
}

type EarnConfig = {
  threshold: number;
  percent: number;
  flat: number;
  split: number;
};

export function OrdersManager({
  orders,
  repartidores = [],
  rates = [],
  earn,
  transferBonusPct,
}: {
  orders: Order[];
  repartidores?: Rep[];
  rates?: ExchangeRate[];
  earn?: EarnConfig;
  transferBonusPct?: number | null;
}) {
  const router = useRouter();
  const { confirm, notify } = useDialog();
  const [busy, setBusy] = useState<string | null>(null);
  const [proofView, setProofView] = useState<string | null>(null);
  const [, start] = useTransition();

  const repMap = useMemo(
    () => new Map(repartidores.map((r) => [r.id, r.name])),
    [repartidores]
  );
  const acceptorName = (id: string | null) =>
    id ? repMap.get(id) ?? "Operador" : "—";

  const ratesByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rates) m[r.currency] = Number(r.rate);
    return m;
  }, [rates]);
  function receivesLabel(o: Order): string | null {
    if (!o.delivery_currency || o.delivery_currency === "USD") return null;
    const rate = ratesByCurrency[o.delivery_currency];
    if (!rate || rate <= 0) return null;
    const isTransfer =
      o.delivery_currency === "CUP" && o.delivery_method === "transferencia";
    const eff = isTransfer ? rate * transferFactor(transferBonusPct) : rate;
    return `${localAmount(Number(o.amount_usd) * eff)} ${o.delivery_currency}${
      isTransfer ? " · 🏦 transferencia" : ""
    }`;
  }

  // Ganancia estimada del repartidor si acepta este pedido (misma fórmula que
  // al aceptar: comisión + su % de reparto). Sin puntos/descuentos → "~".
  function earnEstimate(o: Order): number | null {
    if (!earn) return null;
    const amount = Number(o.amount_usd) || 0;
    if (amount <= 0) return null;
    const commission =
      amount >= earn.threshold
        ? Math.round(((amount * earn.percent) / 100) * 100) / 100
        : earn.flat;
    const partnerShare = commission * (1 - earn.split / 100);
    return Math.round(partnerShare * 100) / 100;
  }

  // "Ahora" se fija tras montar para evitar desajustes de hidratación.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  // Rechazo con motivo opcional.
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [reason, setReason] = useState("");

  // Aceptación con repartidor + nota interna.
  const [accepting, setAccepting] = useState<Order | null>(null);
  const [acceptDeliverer, setAcceptDeliverer] = useState("");
  const [acceptNote, setAcceptNote] = useState("");

  // Búsqueda / filtro en procesados.
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [byFilter, setByFilter] = useState("");
  // Chat por pedido (sheet) + avisos de mensajes no leídos.
  const [chatting, setChatting] = useState<Order | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const counts = await getUnreadOrderCounts();
      if (!stop) setUnread(counts);
    };
    tick();
    const iv = setInterval(tick, 12000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);
  // Al cerrar el chat, ese pedido queda leído: limpia su aviso localmente.
  function openChat(o: Order) {
    setChatting(o);
    setUnread((u) => ({ ...u, [o.id]: 0 }));
  }

  // Orden, agrupación y selección de los pendientes.
  const [sortBy, setSortBy] = useState<"antiguo" | "reciente" | "monto">(
    "antiguo"
  );
  const [grouped, setGrouped] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pendientesRaw = orders.filter((o) => o.status === "pendiente");
  const resto = orders.filter((o) => o.status !== "pendiente");

  // Aviso de pedido nuevo: refresco periódico + banner cuando sube el conteo.
  const prevCount = useRef<number | null>(null);
  const [newAlert, setNewAlert] = useState(false);
  useEffect(() => {
    const c = pendientesRaw.length;
    if (prevCount.current != null && c > prevCount.current) setNewAlert(true);
    prevCount.current = c;
  }, [pendientesRaw.length]);
  useEffect(() => {
    const iv = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(iv);
  }, [router]);

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

  const groups = useMemo(() => {
    if (!grouped) return null;
    const m = new Map<string, Order[]>();
    for (const o of pendientes) {
      const k = o.client_name || "Sin nombre";
      const arr = m.get(k) ?? [];
      arr.push(o);
      m.set(k, arr);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [grouped, pendientes]);

  const pendTotal = pendientesRaw.reduce((s, o) => s + Number(o.amount_usd), 0);
  const oldest = pendientesRaw.reduce<string | null>(
    (min, o) => (min == null || o.created_at < min ? o.created_at : min),
    null
  );

  const restoStatuses = useMemo(
    () => Array.from(new Set(resto.map((o) => o.status))),
    [resto]
  );
  const acceptors = useMemo(
    () =>
      Array.from(
        new Set(resto.map((o) => o.accepted_by).filter(Boolean) as string[])
      ),
    [resto]
  );
  const filteredResto = useMemo(() => {
    const t = q.trim().toLowerCase();
    return resto.filter(
      (o) =>
        (!statusFilter || o.status === statusFilter) &&
        (!byFilter || o.accepted_by === byFilter) &&
        (!t ||
          (o.client_name || "").toLowerCase().includes(t) ||
          (o.beneficiary_name || "").toLowerCase().includes(t))
    );
  }, [resto, q, statusFilter, byFilter]);

  function act(id: string, fn: (id: string) => Promise<unknown>) {
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

  function openAccept(o: Order) {
    setAcceptDeliverer("");
    setAcceptNote("");
    setAccepting(o);
  }

  function confirmAccept() {
    const o = accepting;
    if (!o) return;
    setBusy(o.id);
    const opts = {
      delivererId: acceptDeliverer || null,
      note: acceptNote.trim() || undefined,
    };
    start(async () => {
      const rid = await acceptOrder(o.id, opts);
      setBusy(null);
      setAccepting(null);
      if (typeof rid === "string") router.push(`/remesas/${rid}`);
    });
  }

  function toggleSel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkAccept() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    start(async () => {
      for (const id of ids) await acceptOrder(id);
      setSelected(new Set());
      setSelecting(false);
    });
  }

  async function bulkReject() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const ok = await confirm({
      title: `¿Rechazar ${ids.length} pedidos?`,
      message: "Se rechazarán sin motivo. Puedes deshacerlo luego.",
      confirmLabel: "Rechazar",
    });
    if (!ok) return;
    start(async () => {
      for (const id of ids) await rejectOrder(id);
      setSelected(new Set());
      setSelecting(false);
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

  async function sharePedido(o: Order) {
    const text = [
      "📦 Pedido de remesa",
      `Monto: ${usd(Number(o.amount_usd))}${
        o.delivery_currency ? ` en ${o.delivery_currency}` : ""
      }`,
      `Cliente: ${o.client_name || "—"}${
        o.client_phone ? ` · ${o.client_phone}` : ""
      }`,
      `Recibe: ${o.beneficiary_name || "—"}${
        o.province ? ` · ${o.province}` : ""
      }`,
      o.beneficiary_phone ? `Tel. beneficiario: ${o.beneficiary_phone}` : null,
      o.note ? `Nota: ${o.note}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Pedido", text });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      notify("Pedido copiado");
    } catch {
      /* nada */
    }
  }

  function renderPending(o: Order) {
    // Modo selección: tarjeta compacta seleccionable.
    if (selecting) {
      const on = selected.has(o.id);
      return (
        <button
          key={o.id}
          type="button"
          onClick={() => toggleSel(o.id)}
          className="w-full text-left"
        >
          <Card
            className={cn(
              "flex items-center gap-3 p-3.5 transition",
              on && "border-primary bg-primary/5"
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              )}
            >
              {on && <Check className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {usd(Number(o.amount_usd))} · {o.beneficiary_name || "—"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {o.client_name || "—"}
                {now != null ? ` · ${agoLabel(o.created_at, now)}` : ""}
              </p>
            </div>
          </Card>
        </button>
      );
    }

    const stale =
      now != null &&
      (now - new Date(o.created_at).getTime()) / 3600000 >= STALE_HOURS;
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
          <div className="flex flex-col items-end gap-1">
            <OrderStatusBadge order={o} />
            {earnEstimate(o) != null && earnEstimate(o)! > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-income/10 px-2 py-0.5 text-[11px] font-bold text-income">
                <Coins className="h-3 w-3" /> Ganas ~{usd(earnEstimate(o)!)}
              </span>
            )}
          </div>
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
          {receivesLabel(o) && (
            <p className="flex items-center gap-2 font-semibold text-income">
              <Coins className="h-3.5 w-3.5" />
              Entregas {receivesLabel(o)}
            </p>
          )}
          {o.beneficiary_phone && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {o.beneficiary_phone}
            </p>
          )}
          {o.beneficiary_address && (
            <p className="flex items-start gap-2 font-medium text-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{o.beneficiary_address}</span>
            </p>
          )}
          {o.note && (
            <p className="border-t border-border pt-1 text-muted-foreground">
              “{o.note}”
            </p>
          )}
          {o.payment_proof_url ? (
            <button
              type="button"
              onClick={() => setProofView(o.payment_proof_url!)}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border border-income/30 bg-income/10 p-2 text-left transition active:scale-[0.99]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={o.payment_proof_url}
                alt="Comprobante de pago"
                className="h-10 w-10 shrink-0 rounded-md object-cover"
              />
              <span className="flex items-center gap-1.5 text-xs font-semibold text-income">
                <Receipt className="h-3.5 w-3.5" /> Comprobante de pago · toca
                para ver
              </span>
            </button>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 p-2 text-xs font-medium text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              El cliente aún no subió el comprobante de pago
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
            type="button"
            onClick={() => sharePedido(o)}
            aria-label="Compartir pedido"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition active:scale-95"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openChat(o)}
            aria-label="Chat con el cliente"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-primary transition active:scale-95"
          >
            <MessageSquare className="h-4 w-4" />
            {(unread[o.id] ?? 0) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {unread[o.id]}
              </span>
            )}
          </button>
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
            onClick={() => openAccept(o)}
            disabled={busy === o.id}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Aceptar
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Aviso de pedido nuevo */}
      {newAlert && (
        <button
          type="button"
          onClick={() => setNewAlert(false)}
          className="flex w-full animate-fade-up items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30"
        >
          <Bell className="h-4 w-4" /> Nuevo pedido recibido · toca para ver
        </button>
      )}

      {/* Resumen */}
      {pendientesRaw.length > 0 && (
        <Card className="flex flex-wrap items-center gap-x-2 gap-y-1 border-primary/20 bg-primary/5 p-3.5 text-sm">
          <span className="font-semibold text-foreground">
            {pendientesRaw.length} pendiente
            {pendientesRaw.length > 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="tabular font-semibold text-primary">
            {usd(pendTotal)}
          </span>
          <span className="text-muted-foreground">en juego</span>
          {oldest && now != null && (
            <span className="ml-auto text-xs text-muted-foreground">
              el más viejo {agoLabel(oldest, now)}
            </span>
          )}
        </Card>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pendientes ({pendientes.length})
          </h2>
          {pendientes.length > 1 && (
            <div className="flex items-center gap-3">
              {selecting ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelecting(false);
                    setSelected(new Set());
                  }}
                  className="text-[11px] font-semibold text-muted-foreground transition active:scale-95"
                >
                  Cancelar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelecting(true)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition active:scale-95"
                  >
                    <CheckSquare className="h-3 w-3" /> Elegir
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrouped((g) => !g)}
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-semibold transition active:scale-95",
                      grouped ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Users className="h-3 w-3" /> Agrupar
                  </button>
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
                </>
              )}
            </div>
          )}
        </div>

        {/* Barra de acciones en lote */}
        {selecting && selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {selected.size} elegido{selected.size > 1 ? "s" : ""}
            </span>
            <button
              onClick={bulkReject}
              className="ml-auto rounded-xl border border-border px-3 py-2 text-xs font-semibold text-destructive transition active:scale-95"
            >
              Rechazar ({selected.size})
            </button>
            <button
              onClick={bulkAccept}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition active:scale-95"
            >
              Aceptar ({selected.size})
            </button>
          </div>
        )}

        {pendientes.length === 0 ? (
          <EmptyState
            illustration={<IlluOrders />}
            title="Sin pedidos nuevos"
            description="Cuando un cliente pida una remesa, aparecerá aquí."
          />
        ) : groups ? (
          <div className="space-y-4">
            {groups.map(([client, list]) => (
              <div key={client}>
                <p className="mb-1.5 px-1 text-xs font-semibold text-foreground">
                  {client}{" "}
                  <span className="text-muted-foreground">({list.length})</span>
                </p>
                <div className="space-y-2">{list.map(renderPending)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">{pendientes.map(renderPending)}</div>
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
              {repartidores.length > 0 && acceptors.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Chip
                    active={!byFilter}
                    onClick={() => setByFilter("")}
                    label="Cualquiera"
                  />
                  {acceptors.map((id) => (
                    <Chip
                      key={id}
                      active={byFilter === id}
                      onClick={() => setByFilter(id)}
                      label={acceptorName(id)}
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
              {filteredResto.map((o) => {
                const respondedIn =
                  o.status === "aceptado" && o.accepted_at
                    ? durationLabel(o.created_at, o.accepted_at)
                    : null;
                return (
                  <Card key={o.id} className="space-y-2.5 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {usd(Number(o.amount_usd))} ·{" "}
                          {o.beneficiary_name || "—"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {o.client_name || "—"} ·{" "}
                          {formatDate(o.created_at.slice(0, 10))}
                          {o.accepted_by
                            ? ` · por ${acceptorName(o.accepted_by)}`
                            : ""}
                          {respondedIn ? ` · en ${respondedIn}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openChat(o)}
                          aria-label="Chat con el cliente"
                          className="relative flex h-8 w-8 items-center justify-center rounded-full text-primary transition active:scale-90"
                        >
                          <MessageSquare className="h-4 w-4" />
                          {(unread[o.id] ?? 0) > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                              {unread[o.id]}
                            </span>
                          )}
                        </button>
                        <OrderStatusBadge order={o} />
                      </div>
                    </div>
                    {o.beneficiary_address && (
                      <p className="flex items-start gap-1.5 text-xs text-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{o.beneficiary_address}</span>
                      </p>
                    )}
                    {o.status === "rechazado" && o.reject_reason && (
                      <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                        Motivo: {o.reject_reason}
                      </p>
                    )}
                    {o.status === "rechazado" && (
                      <button
                        onClick={() => act(o.id, restoreOrderToPending)}
                        disabled={busy === o.id}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-foreground transition active:scale-[0.98] disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Deshacer rechazo
                      </button>
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
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Hoja: aceptar (repartidor + nota interna) */}
      <Sheet
        open={!!accepting}
        onClose={() => setAccepting(null)}
        title="Aceptar pedido"
      >
        {accepting && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Se creará la remesa de{" "}
              <span className="font-semibold text-foreground">
                {usd(Number(accepting.amount_usd))}
              </span>{" "}
              para {accepting.beneficiary_name || "el beneficiario"}.
            </p>

            {!accepting.payment_proof_url && (
              <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="font-semibold">
                    El cliente aún no subió el comprobante de pago.
                  </span>{" "}
                  Puedes aceptar de todos modos, pero verifica que el pago te
                  haya llegado antes de continuar.
                </span>
              </div>
            )}

            {repartidores.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Asignar a repartidor
                </label>
                <select
                  value={acceptDeliverer}
                  onChange={(e) => setAcceptDeliverer(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                >
                  <option value="">Sin asignar (lo llevo yo)</option>
                  {[...repartidores]
                    .sort((a, b) => {
                      const pv = accepting.province;
                      const ca = pv && a.coverage?.includes(pv) ? 1 : 0;
                      const cb = pv && b.coverage?.includes(pv) ? 1 : 0;
                      return cb - ca;
                    })
                    .map((r) => {
                      const covers =
                        accepting.province &&
                        r.coverage?.includes(accepting.province);
                      return (
                        <option key={r.id} value={r.id}>
                          {r.name}
                          {covers ? ` · cubre ${accepting.province}` : ""}
                        </option>
                      );
                    })}
                </select>
                {accepting.province && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Provincia del pedido: {accepting.province}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                Nota interna (opcional)
              </label>
              <textarea
                value={acceptNote}
                onChange={(e) => setAcceptNote(e.target.value)}
                rows={2}
                placeholder="Solo para tu equipo, el cliente no la ve."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAccepting(null)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAccept}
                disabled={busy === accepting.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
              >
                <Check className="h-4 w-4" /> Aceptar
              </button>
            </div>
          </div>
        )}
      </Sheet>

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

      {/* Chat con el cliente */}
      <Sheet
        open={!!chatting}
        onClose={() => setChatting(null)}
        title={
          chatting
            ? `Chat · ${chatting.client_name || chatting.beneficiary_name || "cliente"}`
            : "Chat"
        }
      >
        {chatting && <OrderChat orderId={chatting.id} me="negocio" />}
      </Sheet>

      {/* Visor del comprobante de pago */}
      <Sheet
        open={!!proofView}
        onClose={() => setProofView(null)}
        title="Comprobante de pago"
      >
        {proofView && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofView}
              alt="Comprobante de pago"
              className="w-full rounded-2xl border border-border"
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Verifica que el pago llegó antes de confirmar el cobro.
            </p>
          </>
        )}
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
