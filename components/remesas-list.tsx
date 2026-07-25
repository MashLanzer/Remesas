"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Send,
  Check,
  Download,
  ArrowUpDown,
  Calendar,
  Undo2,
  CircleDollarSign,
  CheckCheck,
  MessageCircle,
  Truck,
} from "lucide-react";
import { Card, Badge, EmptyState, Select } from "@/components/ui";
import { IlluOrders } from "@/components/illustrations";
import { usd, formatDate, localAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { updateRemittanceStatus, setClientPaid } from "@/app/actions";
import type { Remittance, RemittanceStatus } from "@/lib/types";

const statusTone: Record<RemittanceStatus, "amber" | "emerald" | "blue"> = {
  pendiente: "amber",
  entregado: "emerald",
  liquidado: "blue",
};

const filters: { key: string; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "pendiente", label: "Pendientes" },
  { key: "entregado", label: "Entregadas" },
  { key: "liquidado", label: "Liquidadas" },
  { key: "por_cobrar", label: "Por cobrar" },
];

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const yest = new Date(now.getTime() - 86400000);
  if (d.toDateString() === now.toDateString()) return "Hoy";
  if (d.toDateString() === yest.toDateString()) return "Ayer";
  return formatDate(dateStr);
}

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function RemesasList({
  remittances,
  initialQuery = "",
  initialEstado = "todas",
  isOperador = true,
}: {
  remittances: Remittance[];
  initialQuery?: string;
  initialEstado?: string;
  isOperador?: boolean;
}) {
  const [estado, setEstado] = useState(initialEstado);
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState<
    "fecha" | "monto" | "ganancia" | "provincia"
  >("fecha");
  const [showDates, setShowDates] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Base: búsqueda + rango de fechas (sin el filtro de estado), para poder
  // contar cuántas hay de cada estado.
  const baseList = useMemo(() => {
    const term = q.trim().toLowerCase();
    return remittances.filter((r) => {
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (term) {
        const hay = [
          r.beneficiary?.name,
          r.client?.name,
          r.beneficiary?.province,
          r.payment_method,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [remittances, q, from, to]);

  const counts = useMemo<Record<string, number>>(
    () => ({
      todas: baseList.length,
      pendiente: baseList.filter((r) => r.status === "pendiente").length,
      entregado: baseList.filter((r) => r.status === "entregado").length,
      liquidado: baseList.filter((r) => r.status === "liquidado").length,
      por_cobrar: baseList.filter((r) => r.client_paid === false).length,
    }),
    [baseList]
  );

  const list = useMemo(() => {
    const out = baseList.filter((r) => {
      if (estado === "por_cobrar") return r.client_paid === false;
      if (estado !== "todas") return r.status === estado;
      return true;
    });
    out.sort((a, b) => {
      if (sort === "monto") return Number(b.amount_usd) - Number(a.amount_usd);
      if (sort === "ganancia")
        return Number(b.total_profit) - Number(a.total_profit);
      if (sort === "provincia") {
        const pa = a.beneficiary?.province || "￿"; // sin provincia al final
        const pb = b.beneficiary?.province || "￿";
        return (
          pa.localeCompare(pb) ||
          b.date.localeCompare(a.date)
        );
      }
      return (
        b.date.localeCompare(a.date) ||
        (b.created_at || "").localeCompare(a.created_at || "")
      );
    });
    return out;
  }, [baseList, estado, sort]);

  const totalSent = list.reduce((s, r) => s + Number(r.amount_usd), 0);
  const totalProfit = list.reduce((s, r) => s + Number(r.total_profit), 0);

  // Total por moneda de entrega
  const byCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of list)
      m[r.delivery_currency] =
        (m[r.delivery_currency] || 0) + Number(r.local_amount);
    return Object.entries(m);
  }, [list]);

  // Agrupar por fecha (orden por fecha) o por provincia (orden por provincia).
  const groups = useMemo(() => {
    if (sort === "fecha") {
      const out: { label: string; items: Remittance[] }[] = [];
      for (const r of list) {
        const label = dateLabel(r.date);
        const last = out[out.length - 1];
        if (last && last.label === label) last.items.push(r);
        else out.push({ label, items: [r] });
      }
      return out;
    }
    if (sort === "provincia") {
      const out: { label: string; items: Remittance[] }[] = [];
      for (const r of list) {
        const label = r.beneficiary?.province || "Sin provincia";
        const last = out[out.length - 1];
        if (last && last.label === label) last.items.push(r);
        else out.push({ label, items: [r] });
      }
      return out;
    }
    return [{ label: "", items: list }];
  }, [list, sort]);

  function presetToday() {
    const t = ymdLocal(new Date());
    setFrom(t);
    setTo(t);
  }
  function preset7() {
    const now = new Date();
    const f = new Date(now);
    f.setDate(f.getDate() - 6);
    setFrom(ymdLocal(f));
    setTo(ymdLocal(now));
  }
  function presetMonth() {
    const now = new Date();
    setFrom(ymdLocal(new Date(now.getFullYear(), now.getMonth(), 1)));
    setTo(ymdLocal(now));
  }
  function clearDates() {
    setFrom("");
    setTo("");
  }

  const todayStr = ymdLocal(new Date());
  const isToday = from === todayStr && to === todayStr;
  function toggleToday() {
    if (isToday) clearDates();
    else {
      setFrom(todayStr);
      setTo(todayStr);
    }
  }

  function exportCsv() {
    const headers = [
      "Fecha",
      "Cliente",
      "Beneficiario",
      "Monto USD",
      "Comisión",
      "Total cobrado",
      "Método",
      "Moneda",
      "Monto local",
      "Ganancia",
      "Tu parte",
      "Estado",
      "Cobrado",
    ];
    const rows = list.map((r) =>
      [
        r.date,
        r.client?.name,
        r.beneficiary?.name,
        r.amount_usd,
        r.commission,
        r.total_received,
        r.payment_method,
        r.delivery_currency,
        r.local_amount,
        r.total_profit,
        isOperador ? r.my_share : r.partner_share,
        r.status,
        r.client_paid === false ? "No" : "Sí",
      ]
        .map(csvCell)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "remesas.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por cliente, beneficiario…"
          className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {/* Filtros de estado */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setEstado(f.key)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
              estado === f.key
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            )}
          >
            {f.label}
            {counts[f.key] ? ` (${counts[f.key]})` : ""}
          </button>
        ))}
        <button
          onClick={toggleToday}
          className={cn(
            "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
            isToday
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground"
          )}
        >
          <Calendar className="h-3 w-3" /> Hoy
        </button>
      </div>

      {/* Controles: orden, fechas, exportar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Select
            title="Ordenar por"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bg-card py-2 pl-8 text-xs font-medium"
          >
            <option value="fecha">Más recientes</option>
            <option value="monto">Mayor monto</option>
            <option value="ganancia">Mayor ganancia</option>
            {!isOperador && <option value="provincia">Por provincia</option>}
          </Select>
        </div>
        <button
          onClick={() => setShowDates((s) => !s)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border transition",
            showDates || from || to
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground"
          )}
          aria-label="Filtrar por fecha"
        >
          <Calendar className="h-4 w-4" />
        </button>
        <button
          onClick={exportCsv}
          disabled={list.length === 0}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition disabled:opacity-40"
          aria-label="Exportar CSV"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {showDates && (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Hoy", fn: presetToday },
              { label: "7 días", fn: preset7 },
              { label: "Este mes", fn: presetMonth },
            ].map((p) => (
              <button
                key={p.label}
                onClick={p.fn}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition active:scale-95"
              >
                {p.label}
              </button>
            ))}
            {(from || to) && (
              <button
                onClick={clearDates}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition active:scale-95"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Hasta
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>
          </div>
        </div>
      )}

      {/* Resumen del filtro (compacto: enviado · ganancia · entregado) */}
      {list.length > 0 && (
        <div className="mb-4 flex items-stretch gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">
              Enviado ({list.length})
            </p>
            <p className="tabular text-base font-bold text-foreground">
              {usd(totalSent)}
            </p>
          </div>
          <div className="min-w-0 border-l border-border pl-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              Ganancia
            </p>
            <p className="tabular text-base font-bold text-income">
              {usd(totalProfit)}
            </p>
          </div>
          {byCurrency.length > 0 && (
            <div className="ml-auto min-w-0 border-l border-border pl-3 text-right">
              <p className="text-[11px] font-medium text-muted-foreground">
                Entregado
              </p>
              {byCurrency.map(([cur, amt]) => (
                <p
                  key={cur}
                  className="tabular truncate text-xs font-semibold text-foreground"
                >
                  {localAmount(amt)} {cur}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          illustration={
            !isOperador && !q && !from && !to ? <IlluOrders /> : undefined
          }
          title={q || from || to ? "Sin resultados" : "No hay remesas aquí"}
          description={
            q || from || to
              ? "Prueba con otros filtros."
              : "Cuando registres envíos aparecerán en esta lista."
          }
          action={
            !q ? (
              <Link
                href="/remesas/nueva"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Registrar remesa
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((g, gi) => (
            <div key={g.label || gi}>
              {g.label && (
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.label}
                </p>
              )}
              <div className="space-y-2">
                {g.items.map((r) => (
                  <RemesaCard key={r.id} r={r} isOperador={isOperador} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RemesaCard({
  r,
  isOperador = true,
}: {
  r: Remittance;
  isOperador?: boolean;
}) {
  const [pending, start] = useTransition();
  const [undoDeliver, setUndoDeliver] = useState(false);
  const [cobrada, setCobrada] = useState(false);
  const [liquidada, setLiquidada] = useState(false);

  function deliver() {
    setUndoDeliver(true);
    start(() => updateRemittanceStatus(r.id, "entregado"));
    setTimeout(() => setUndoDeliver(false), 6000);
  }
  function undoDeliverFn() {
    setUndoDeliver(false);
    start(() => updateRemittanceStatus(r.id, "pendiente"));
  }
  function cobrar() {
    setCobrada(true);
    start(() => setClientPaid(r.id, true));
    setTimeout(() => setCobrada(false), 6000);
  }
  function undoCobrar() {
    setCobrada(false);
    start(() => setClientPaid(r.id, false));
  }
  function liquidar() {
    setLiquidada(true);
    start(() => updateRemittanceStatus(r.id, "liquidado"));
    setTimeout(() => setLiquidada(false), 6000);
  }
  function undoLiquidar() {
    setLiquidada(false);
    start(() => updateRemittanceStatus(r.id, "entregado"));
  }

  // Solo el operador marca el cobro al cliente (él recibe el dinero).
  const showCobrar = isOperador && (cobrada || r.client_paid === false);
  const showDeliver = undoDeliver || r.status === "pendiente";
  const showLiquidar = liquidada || r.status === "entregado";
  const hasActions = showCobrar || showDeliver || showLiquidar;

  const waDigits =
    (r.client?.phone || r.beneficiary?.phone)?.replace(/\D/g, "") || "";
  const waText = encodeURIComponent(
    `Hola, te escribo sobre la remesa de ${usd(Number(r.amount_usd))}${
      r.beneficiary?.name ? ` para ${r.beneficiary.name}` : ""
    }.`
  );

  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2">
        <Link
          href={`/remesas/${r.id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              isOperador
                ? "bg-primary/10 text-primary"
                : r.status === "pendiente"
                ? "bg-warning/10 text-warning"
                : r.status === "entregado"
                ? "bg-income/10 text-income"
                : "bg-info/10 text-info"
            )}
          >
            {isOperador ? (
              <Send className="h-4 w-4" />
            ) : r.status === "pendiente" ? (
              <Truck className="h-4 w-4" />
            ) : r.status === "entregado" ? (
              <Check className="h-4 w-4" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {r.beneficiary?.name || r.client?.name || "Remesa"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatDate(r.date)}
              {r.payment_method ? ` · ${r.payment_method}` : ""}
            </p>
          </div>
        </Link>
        <div className="flex flex-col items-end gap-1">
          <span className="tabular text-sm font-bold text-foreground">
            {usd(r.amount_usd)}
          </span>
          <div className="flex items-center gap-1">
            {r.client_paid === false && <Badge tone="amber">Por cobrar</Badge>}
            {!isOperador && r.status === "pendiente" && r.en_route_at ? (
              <Badge tone="blue">En camino</Badge>
            ) : (
              <Badge tone={statusTone[r.status]}>{r.status}</Badge>
            )}
          </div>
        </div>
        {waDigits && (
          <a
            href={`https://wa.me/${waDigits}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-income transition active:scale-90"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="mt-2 border-t border-border pt-2">
        <p className="text-xs text-muted-foreground">
          {isOperador
            ? `Ganancia ${usd(r.total_profit)} · Tu parte ${usd(r.my_share)}`
            : `Tu parte ${usd(r.partner_share)}`}
        </p>
        {!isOperador && (
          <MiniStepper
            stage={
              r.status === "liquidado" ? 3 : r.status === "entregado" ? 2 : 1
            }
          />
        )}
        {hasActions && (
          <div className="mt-2 flex gap-2">
            {showCobrar &&
              (cobrada ? (
                <QuickBtn onClick={undoCobrar} disabled={pending} tone="muted">
                  <Undo2 className="h-3.5 w-3.5" /> Deshacer
                </QuickBtn>
              ) : (
                <QuickBtn onClick={cobrar} disabled={pending} tone="warning">
                  <CircleDollarSign className="h-3.5 w-3.5" /> Cobrar
                </QuickBtn>
              ))}
            {showDeliver &&
              (undoDeliver ? (
                <QuickBtn onClick={undoDeliverFn} disabled={pending} tone="muted">
                  <Undo2 className="h-3.5 w-3.5" /> Deshacer
                </QuickBtn>
              ) : (
                <QuickBtn onClick={deliver} disabled={pending} tone="income">
                  <Check className="h-3.5 w-3.5" /> Entregar
                </QuickBtn>
              ))}
            {showLiquidar &&
              (liquidada ? (
                <QuickBtn onClick={undoLiquidar} disabled={pending} tone="muted">
                  <Undo2 className="h-3.5 w-3.5" /> Deshacer
                </QuickBtn>
              ) : (
                <QuickBtn onClick={liquidar} disabled={pending} tone="info">
                  <CheckCheck className="h-3.5 w-3.5" /> Liquidar
                </QuickBtn>
              ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function MiniStepper({ stage }: { stage: 1 | 2 | 3 }) {
  const steps = ["Pendiente", "Entregado", "Liquidado"];
  return (
    <div className="mt-2 flex items-center">
      {steps.map((label, i) => {
        const done = i < stage;
        const active = i === stage - 1;
        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  done
                    ? active
                      ? "bg-primary ring-2 ring-primary/30"
                      : "bg-primary"
                    : "bg-muted"
                )}
              />
              <span
                className={cn(
                  "mt-1 text-[9px] font-medium",
                  done ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "mx-1 h-0.5 flex-1 rounded-full",
                  i < stage - 1 ? "bg-primary/50" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuickBtn({
  onClick,
  disabled,
  tone,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone: "income" | "warning" | "info" | "muted";
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "income"
      ? "bg-income/10 text-income"
      : tone === "warning"
      ? "bg-warning/10 text-warning"
      : tone === "info"
      ? "bg-info/10 text-info"
      : "bg-muted text-muted-foreground";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-50",
        toneCls
      )}
    >
      {children}
    </button>
  );
}
