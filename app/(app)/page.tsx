import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { getRemittances, getSettlements } from "@/lib/data";
import { calcPartnerBalance } from "@/lib/calc";
import { usd, formatDate } from "@/lib/utils";
import { Stat, Card, LinkButton, Badge, EmptyState, PageHeader } from "@/components/ui";
import type { RemittanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusTone: Record<RemittanceStatus, "amber" | "emerald" | "blue"> = {
  pendiente: "amber",
  entregado: "emerald",
  liquidado: "blue",
};

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
    <div>
      <PageHeader
        title="Resumen"
        subtitle="Cómo va el negocio de un vistazo"
        action={
          <LinkButton href="/remesas/nueva">
            <Plus className="h-4 w-4" /> Nueva
          </LinkButton>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total enviado" value={usd(totalSent)} hint={`${remittances.length} remesas`} />
        <Stat label="Ganancia total" value={usd(totalProfit)} tone="positive" />
        <Stat label="Tu parte" value={usd(myProfit)} tone="positive" />
        <Stat
          label={partnerBalance >= 0 ? "Le debes al socio" : "El socio te debe"}
          value={usd(Math.abs(partnerBalance))}
          tone={partnerBalance > 0 ? "negative" : "positive"}
        />
      </div>

      {pending.length > 0 && (
        <Card className="mt-4 border-warning/30 bg-warning/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-warning">
                {pending.length} remesa{pending.length > 1 ? "s" : ""} pendiente
                {pending.length > 1 ? "s" : ""} de entregar
              </p>
              <p className="text-xs text-warning">
                {usd(pending.reduce((s, r) => s + Number(r.amount_usd), 0))} por entregar
              </p>
            </div>
            <Link href="/remesas?estado=pendiente" className="text-warning">
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </Card>
      )}

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Últimas remesas</h2>
        <Link href="/remesas" className="text-xs font-medium text-foreground">
          Ver todas
        </Link>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          title="Aún no hay remesas"
          description="Registra tu primer envío para empezar a llevar la cuenta."
          action={
            <LinkButton href="/remesas/nueva">
              <Plus className="h-4 w-4" /> Registrar remesa
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-2">
          {recent.map((r) => (
            <Link key={r.id} href={`/remesas/${r.id}`}>
              <Card className="flex items-center justify-between p-3.5 transition hover:border-ring">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {r.beneficiary?.name || r.client?.name || "Remesa"}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-foreground">
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
  );
}
