import Link from "next/link";
import {
  Plus,
  Send,
  Handshake,
  BarChart3,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { getRemittances, getSettlements } from "@/lib/data";
import { calcPartnerBalance } from "@/lib/calc";
import { usd, formatDate } from "@/lib/utils";
import { Card, Badge, EmptyState } from "@/components/ui";
import type { RemittanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusTone: Record<RemittanceStatus, "amber" | "emerald" | "blue"> = {
  pendiente: "amber",
  entregado: "emerald",
  liquidado: "blue",
};

const actions = [
  { href: "/remesas/nueva", label: "Nueva", icon: Plus },
  { href: "/remesas", label: "Remesas", icon: Send },
  { href: "/socios", label: "Socios", icon: Handshake },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

export default async function DashboardPage() {
  const [remittances, settlements] = await Promise.all([
    getRemittances(),
    getSettlements(),
  ]);

  const totalSent = remittances.reduce((s, r) => s + Number(r.amount_usd), 0);
  const totalProfit = remittances.reduce((s, r) => s + Number(r.total_profit), 0);
  const myProfit = remittances.reduce((s, r) => s + Number(r.my_share), 0);
  const pending = remittances.filter((r) => r.status === "pendiente");
  const partnerBalance = calcPartnerBalance(remittances, settlements);
  const recent = remittances.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Tarjeta principal */}
      <div className="hero-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-xl shadow-primary/20">
        <p className="text-sm font-medium text-white/70">Ganancia total</p>
        <p className="tabular mt-1 text-4xl font-extrabold">{usd(totalProfit)}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Wallet className="h-3.5 w-3.5" /> Tu parte {usd(myProfit)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Send className="h-3.5 w-3.5" /> Enviado {usd(totalSent)}
          </span>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-4 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-primary transition active:scale-95">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {a.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Alerta de pendientes */}
      {pending.length > 0 && (
        <Link href="/remesas?estado=pendiente">
          <Card className="flex items-center justify-between border-warning/30 bg-warning/10">
            <div>
              <p className="text-sm font-semibold text-warning">
                {pending.length} pendiente{pending.length > 1 ? "s" : ""} de
                entregar
              </p>
              <p className="text-xs text-warning/80">
                {usd(pending.reduce((s, r) => s + Number(r.amount_usd), 0))} por
                entregar
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-warning" />
          </Card>
        </Link>
      )}

      {/* Mini métricas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Remesas</p>
          <p className="tabular mt-1 text-2xl font-bold">{remittances.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">
            {partnerBalance >= 0 ? "Le debes al socio" : "El socio te debe"}
          </p>
          <p
            className={
              "tabular mt-1 text-2xl font-bold " +
              (partnerBalance > 0 ? "text-destructive" : "text-income")
            }
          >
            {usd(Math.abs(partnerBalance))}
          </p>
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
              <Link key={r.id} href={`/remesas/${r.id}`}>
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
