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
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCw,
} from "lucide-react";
import { Card, Badge, EmptyState } from "@/components/ui";
import { usd, formatDate, localAmount, cn } from "@/lib/utils";
import type {
  Remittance,
  RemittanceStatus,
  ExchangeRate,
} from "@/lib/types";

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

function MetricTile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: typeof Truck;
  tone: "warning" | "income" | "destructive" | "primary";
  label: string;
  value: string;
  hint: string;
}) {
  const toneCls =
    tone === "warning"
      ? "bg-warning/10 text-warning"
      : tone === "income"
      ? "bg-income/10 text-income"
      : tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : "bg-primary/10 text-primary";
  return (
    <Card className="p-4">
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl",
          toneCls
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="tabular mt-2 text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </Card>
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
  monthlyGoal = 0,
  rates = [],
}: {
  remittances: Remittance[];
  partnerBalance: number;
  name: string | null;
  isOperador?: boolean;
  pendingOrders?: number;
  monthlyGoal?: number;
  rates?: ExchangeRate[];
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

  // Para el operador, el titular es la ganancia total del negocio; para el
  // repartidor, su propia ganancia (partner_share) — no la del negocio.
  const profit = filtered.reduce(
    (s, r) => s + Number(isRep ? r.partner_share : r.total_profit),
    0
  );
  // "Tu parte": para el operador es my_share; para el repartidor, partner_share.
  const myProfit = filtered.reduce(
    (s, r) => s + Number(isRep ? r.partner_share : r.my_share),
    0
  );
  const sent = filtered.reduce((s, r) => s + Number(r.amount_usd), 0);

  // Comparativa vs período anterior (mismo criterio de "tu parte").
  const prevProfit = useMemo(() => {
    if (period === "todo") return null;
    const now = new Date();
    let start: Date;
    let end: Date;
    if (period === "hoy") {
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else {
      end = new Date(now.getFullYear(), now.getMonth(), 1);
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }
    return remittances
      .filter((r) => {
        const d = new Date(r.date + "T00:00:00");
        return d >= start && d < end;
      })
      .reduce(
        (s, r) => s + Number(isRep ? r.partner_share : r.total_profit),
        0
      );
  }, [remittances, period, isRep]);

  const delta =
    prevProfit != null && prevProfit > 0
      ? ((profit - prevProfit) / prevProfit) * 100
      : null;
  const compareLabel = period === "hoy" ? "vs ayer" : "vs mes pasado";

  // Ganancia del mes en curso — la meta siempre mide el mes, en cualquier vista.
  const monthProfit = useMemo(() => {
    const now = new Date();
    return remittances
      .filter((r) => {
        const d = new Date(r.date + "T00:00:00");
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      })
      .reduce((s, r) => s + Number(r.total_profit), 0);
  }, [remittances]);

  // La meta del mes es del negocio (operador); no aplica al repartidor.
  const goalPct =
    !isRep && monthlyGoal > 0
      ? Math.min((monthProfit / monthlyGoal) * 100, 100)
      : null;

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

  const activeRates = rates.filter(
    (r) => r.active !== false && Number(r.rate) > 0
  );

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

      {/* Para entregar hoy: el trabajo del repartidor, arriba y accionable */}
      {isRep && pending.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Truck className="h-4 w-4" />
              </span>
              Para entregar
            </h2>
            {pending.length > 3 && (
              <Link
                href="/remesas?estado=pendiente"
                className="text-xs font-semibold text-primary"
              >
                Ver todas ({pending.length})
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {pending.slice(0, 3).map((r) => (
              <Link key={r.id} href={`/remesas/${r.id}`} className="block">
                <Card className="flex items-center gap-3 border-warning/20 bg-warning/5 p-3.5 transition active:scale-[0.99]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.beneficiary?.name || r.client?.name || "Remesa"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.beneficiary?.province
                        ? `${r.beneficiary.province} · `
                        : ""}
                      {formatDate(r.date)}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-sm font-bold text-foreground">
                    {usd(r.amount_usd)}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
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
          {isRep ? "Tu ganancia" : "Ganancia"} ·{" "}
          {periods.find((p) => p.key === period)?.label.toLowerCase()}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="tabular text-4xl font-extrabold">{usd(profit)}</p>
          {delta != null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold backdrop-blur",
                delta >= 0 ? "bg-white/25" : "bg-black/20"
              )}
            >
              {delta >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(0)}% {compareLabel}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!isRep && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Wallet className="h-3.5 w-3.5" /> Tu parte {usd(myProfit)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Send className="h-3.5 w-3.5" /> Enviado {usd(sent)}
          </span>
        </div>

        {/* Meta del mes: barra fina dentro de la tarjeta (solo en 'Este mes') */}
        {goalPct != null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-white/80">
              <span className="inline-flex items-center gap-1">
                <Target className="h-3.5 w-3.5" /> Meta del mes
              </span>
              <span className="tabular font-semibold text-white">
                {usd(monthProfit)} / {usd(monthlyGoal)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-white/70">
              {goalPct >= 100
                ? "¡Meta del mes alcanzada! 🎉"
                : `${Math.round(goalPct)}% de la meta · faltan ${usd(
                    Math.max(monthlyGoal - monthProfit, 0)
                  )}`}
            </p>
          </div>
        )}
      </div>

      {/* Acciones rápidas (cuadros) */}
      {isRep ? (
        <div className="grid grid-cols-2 gap-3">
          {actions.map((a, i) => {
            const Icon = a.icon;
            const tone =
              i === 0
                ? "bg-primary/10 text-primary"
                : "bg-info/10 text-info";
            return (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition active:scale-[0.98]"
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                    tone
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {a.label}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
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
      )}

      {/* Tasas del día: tira compacta tocable hacia Tasas */}
      {activeRates.length > 0 && (
        <Link href="/tasas" className="block">
          <Card className="flex items-center gap-2 overflow-x-auto p-3 transition active:scale-[0.99]">
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <RefreshCw className="h-3 w-3" /> 1 USD
            </span>
            {activeRates.map((r) => (
              <span
                key={r.currency}
                className="shrink-0 whitespace-nowrap rounded-lg bg-primary/10 px-2.5 py-1 text-xs"
              >
                <span className="tabular font-bold text-primary">
                  {localAmount(Number(r.rate))}
                </span>{" "}
                <span className="font-medium text-primary/60">{r.currency}</span>
              </span>
            ))}
          </Card>
        </Link>
      )}

      {/* Métricas */}
      {isRep ? (
        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            icon={Truck}
            tone="warning"
            label="Pendientes"
            value={String(pending.length)}
            hint={`${usd(pendingTotal)} por entregar`}
          />
          <MetricTile
            icon={Coins}
            tone={partnerBalance < 0 ? "destructive" : "income"}
            label={
              partnerBalance >= 0
                ? "Por cobrar al operador"
                : "Le debes al operador"
            }
            value={usd(Math.abs(partnerBalance))}
            hint="saldo actual"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Pendientes
            </p>
            <p className="tabular mt-1 text-2xl font-bold text-foreground">
              {pending.length}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {usd(pendingTotal)} por entregar
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {partnerBalance >= 0 ? "Por enviar a Cuba" : "A tu favor"}
            </p>
            <p
              className={
                "tabular mt-1 text-2xl font-bold " +
                (partnerBalance > 0
                  ? "text-destructive"
                  : partnerBalance < 0
                  ? "text-income"
                  : "text-foreground")
              }
            >
              {usd(Math.abs(partnerBalance))}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">saldo actual</p>
          </Card>
        </div>
      )}

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
