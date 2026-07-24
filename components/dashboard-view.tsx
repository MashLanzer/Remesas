"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Send,
  Wallet,
  LayoutGrid,
  Inbox,
  UserCog,
  Activity,
  Truck,
  Coins,
} from "lucide-react";
import { Card, Badge, EmptyState } from "@/components/ui";
import { usd, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Remittance, RemittanceStatus } from "@/lib/types";

const statusTone: Record<RemittanceStatus, "amber" | "emerald" | "blue"> = {
  pendiente: "amber",
  entregado: "emerald",
  liquidado: "blue",
};

function DaySeg({
  href,
  icon: Icon,
  value,
  label,
  tone,
}: {
  href: string;
  icon: typeof Truck;
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-0.5 px-2 py-2.5 transition active:scale-95"
    >
      <Icon className={cn("h-4 w-4", tone)} />
      <span className="tabular text-sm font-bold leading-none text-foreground">
        {value}
      </span>
      <span className="text-center text-[10px] font-medium leading-tight text-muted-foreground">
        {label}
      </span>
    </Link>
  );
}

const periods = [
  { key: "todo", label: "Todo" },
  { key: "hoy", label: "Hoy" },
  { key: "mes", label: "Este mes" },
] as const;

type PeriodKey = (typeof periods)[number]["key"];

export function DashboardView({
  remittances,
  partnerBalance,
  name,
  isOperador = true,
  pendingOrders = 0,
}: {
  remittances: Remittance[];
  partnerBalance: number;
  name: string | null;
  isOperador?: boolean;
  pendingOrders?: number;
}) {
  const isRep = !isOperador;
  const [period, setPeriod] = useState<PeriodKey>("todo");

  // Accesos rápidos: solo lo útil y que no repita la barra inferior
  // (Inicio/Remesas/Agenda/Finanzas).
  const actions = isRep
    ? [
        { href: "/remesas/nueva", label: "Nueva remesa", icon: Plus },
        { href: "/pedidos", label: "Pedidos", icon: Inbox },
      ]
    : [
        { href: "/remesas/nueva", label: "Nueva remesa", icon: Plus },
        { href: "/gestion", label: "Gestión", icon: LayoutGrid },
        { href: "/ajustes/repartidores", label: "Equipo", icon: UserCog },
        { href: "/actividad", label: "Actividad", icon: Activity },
      ];

  const filtered = useMemo(() => {
    if (period === "todo") return remittances;
    const now = new Date();
    return remittances.filter((r) => {
      const d = new Date(r.date + "T00:00:00");
      if (period === "hoy") {
        return d.toDateString() === now.toDateString();
      }
      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      );
    });
  }, [remittances, period]);

  const profit = filtered.reduce((s, r) => s + Number(r.total_profit), 0);
  // "Tu parte": para el operador es my_share; para el repartidor, partner_share.
  const myProfit = filtered.reduce(
    (s, r) => s + Number(isRep ? r.partner_share : r.my_share),
    0
  );
  const sent = filtered.reduce((s, r) => s + Number(r.amount_usd), 0);

  // Pendientes: siempre global (sin filtrar por período).
  const pending = remittances.filter((r) => r.status === "pendiente");
  const pendingTotal = pending.reduce((s, r) => s + Number(r.amount_usd), 0);

  // Por cobrar a clientes: remesas marcadas como no cobradas.
  const unpaid = remittances.filter((r) => r.client_paid === false);
  const unpaidTotal = unpaid.reduce((s, r) => s + Number(r.amount_usd), 0);

  const recent = remittances.slice(0, 5);
  const firstName = name?.trim().split(" ")[0];

  // Saludo según la hora del día.
  const hour = new Date().getHours();
  const greetWord =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const hasDaySummary =
    pending.length > 0 || unpaid.length > 0 || pendingOrders > 0;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {greetWord}
        {firstName && (
          <>
            , <span className="font-semibold text-foreground">{firstName}</span>
          </>
        )}{" "}
        👋
      </p>

      {/* Resumen "Tu día": una línea accionable que reúne lo pendiente */}
      {hasDaySummary && (
        <Card className="flex divide-x divide-border p-0">
          {pending.length > 0 && (
            <DaySeg
              href="/remesas?estado=pendiente"
              icon={Truck}
              value={String(pending.length)}
              label="por entregar"
              tone="text-warning"
            />
          )}
          {unpaid.length > 0 && (
            <DaySeg
              href="/finanzas#por-cobrar"
              icon={Coins}
              value={usd(unpaidTotal)}
              label="por cobrar"
              tone="text-income"
            />
          )}
          {pendingOrders > 0 && (
            <DaySeg
              href="/pedidos"
              icon={Inbox}
              value={String(pendingOrders)}
              label={pendingOrders > 1 ? "pedidos" : "pedido"}
              tone="text-primary"
            />
          )}
        </Card>
      )}

      {/* Selector de período */}
      <div className="flex gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              period === p.key
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Tarjeta principal */}
      <div className="hero-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-xl shadow-primary/20">
        <p className="text-sm font-medium text-white/70">
          Ganancia · {periods.find((p) => p.key === period)?.label.toLowerCase()}
        </p>
        <p className="tabular mt-1 text-4xl font-extrabold">{usd(profit)}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Wallet className="h-3.5 w-3.5" /> Tu parte {usd(myProfit)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Send className="h-3.5 w-3.5" /> Enviado {usd(sent)}
          </span>
        </div>
      </div>

      {/* Acciones rápidas (cuadros) */}
      <div
        className={cn(
          "grid gap-2",
          actions.length >= 4 ? "grid-cols-4" : "grid-cols-2"
        )}
      >
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <span className="flex aspect-square w-full items-center justify-center rounded-2xl border border-border bg-card text-primary transition active:scale-95">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                {a.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Pendientes</p>
          <p className="tabular mt-1 text-2xl font-bold text-foreground">
            {pending.length}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {usd(pendingTotal)} por entregar
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">
            {isRep
              ? partnerBalance >= 0
                ? "Por cobrar al operador"
                : "Le debes al operador"
              : partnerBalance >= 0
              ? "Por enviar a Cuba"
              : "A tu favor"}
          </p>
          <p
            className={
              "tabular mt-1 text-2xl font-bold " +
              // Para el repartidor, un saldo a favor (le deben) es positivo/verde;
              // para el operador, deber dinero es lo "rojo".
              (partnerBalance > 0
                ? isRep
                  ? "text-income"
                  : "text-destructive"
                : partnerBalance < 0
                ? isRep
                  ? "text-destructive"
                  : "text-income"
                : "text-foreground")
            }
          >
            {usd(Math.abs(partnerBalance))}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">saldo actual</p>
        </Card>
      </div>

      {/* Últimas remesas */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Últimas remesas</h2>
          <Link href="/remesas" className="text-xs font-semibold text-primary">
            Ver todas
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="Aún no hay remesas"
            description="Registra tu primer envío para empezar a llevar la cuenta."
            action={
              <Link
                href="/remesas/nueva"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Registrar remesa
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <Link key={r.id} href={`/remesas/${r.id}`} className="block">
                <Card className="flex items-center justify-between p-3.5 transition active:scale-[0.99]">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Send className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {r.beneficiary?.name || r.client?.name || "Remesa"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="tabular text-sm font-bold text-foreground">
                      {usd(r.amount_usd)}
                    </span>
                    <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
