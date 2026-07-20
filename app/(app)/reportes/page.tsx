import { getRemittances } from "@/lib/data";
import { usd } from "@/lib/utils";
import { Card, Stat, PageHeader, EmptyState } from "@/components/ui";
import type { Remittance } from "@/lib/types";

export const dynamic = "force-dynamic";

function inMonth(dateStr: string, year: number, month: number): boolean {
  const d = new Date(dateStr);
  return d.getUTCFullYear() === year && d.getUTCMonth() === month;
}

function aggregate(list: Remittance[]) {
  return {
    count: list.length,
    sent: list.reduce((s, r) => s + Number(r.amount_usd), 0),
    profit: list.reduce((s, r) => s + Number(r.total_profit), 0),
    mine: list.reduce((s, r) => s + Number(r.my_share), 0),
    partner: list.reduce((s, r) => s + Number(r.partner_share), 0),
  };
}

export default async function ReportesPage() {
  const all = await getRemittances();

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const prevMonthDate = new Date(Date.UTC(y, m - 1, 1));
  const py = prevMonthDate.getUTCFullYear();
  const pm = prevMonthDate.getUTCMonth();

  const thisMonth = aggregate(all.filter((r) => inMonth(r.date, y, m)));
  const lastMonth = aggregate(all.filter((r) => inMonth(r.date, py, pm)));
  const total = aggregate(all);

  // Desglose por método de pago
  const byMethod: Record<string, { count: number; total: number }> = {};
  for (const r of all) {
    const key = r.payment_method || "Sin método";
    byMethod[key] = byMethod[key] || { count: 0, total: 0 };
    byMethod[key].count += 1;
    byMethod[key].total += Number(r.total_received);
  }
  const methodEntries = Object.entries(byMethod).sort((a, b) => b[1].total - a[1].total);

  const monthName = now.toLocaleDateString("es-ES", { month: "long" });

  if (all.length === 0) {
    return (
      <div>
        <PageHeader title="Reportes" />
        <EmptyState
          title="Aún no hay datos"
          description="Los reportes se llenan a medida que registras remesas."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Ganancias y envíos por período" />

      <h2 className="mb-2 text-sm font-semibold capitalize text-foreground">
        {monthName}
      </h2>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Stat label="Enviado" value={usd(thisMonth.sent)} hint={`${thisMonth.count} remesas`} />
        <Stat label="Ganancia" value={usd(thisMonth.profit)} tone="positive" />
        <Stat label="Tu parte" value={usd(thisMonth.mine)} tone="positive" />
        <Stat label="Parte del socio" value={usd(thisMonth.partner)} />
      </div>

      <h2 className="mb-2 text-sm font-semibold text-foreground">Mes anterior</h2>
      <Card className="mb-5 space-y-2">
        <Row label="Enviado" value={usd(lastMonth.sent)} />
        <Row label="Ganancia" value={usd(lastMonth.profit)} />
        <Row label="Tu parte" value={usd(lastMonth.mine)} />
      </Card>

      <h2 className="mb-2 text-sm font-semibold text-foreground">Histórico total</h2>
      <Card className="mb-5 space-y-2">
        <Row label="Remesas" value={String(total.count)} />
        <Row label="Total enviado" value={usd(total.sent)} />
        <Row label="Ganancia total" value={usd(total.profit)} strong />
        <Row label="Tu parte" value={usd(total.mine)} />
        <Row label="Parte del socio" value={usd(total.partner)} />
      </Card>

      <h2 className="mb-2 text-sm font-semibold text-foreground">Por método de pago</h2>
      <Card className="space-y-2">
        {methodEntries.map(([method, data]) => (
          <Row
            key={method}
            label={`${method} (${data.count})`}
            value={usd(data.total)}
          />
        ))}
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-foreground" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}
