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

  const thisMonth = aggregate(all.filter((r) => inMonth(r.date, y, m)));
  const total = aggregate(all);

  // Ganancia de los últimos 6 meses (para el gráfico)
  const months: { label: string; profit: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 1));
    const profit = all
      .filter((r) => inMonth(r.date, d.getUTCFullYear(), d.getUTCMonth()))
      .reduce((s, r) => s + Number(r.total_profit), 0);
    months.push({
      label: d.toLocaleDateString("es-ES", { month: "short" }),
      profit,
    });
  }
  const maxP = Math.max(...months.map((x) => x.profit), 1);

  // Desglose por método de pago
  const byMethod: Record<string, { count: number; total: number }> = {};
  for (const r of all) {
    const key = r.payment_method || "Sin método";
    byMethod[key] = byMethod[key] || { count: 0, total: 0 };
    byMethod[key].count += 1;
    byMethod[key].total += Number(r.total_received);
  }
  const methodEntries = Object.entries(byMethod).sort(
    (a, b) => b[1].total - a[1].total
  );

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
    <div className="space-y-5">
      <PageHeader title="Reportes" subtitle="Ganancias y envíos por período" />

      {/* Gráfico de ganancia por mes */}
      <Card>
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-sm font-bold text-foreground">Ganancia por mes</p>
          <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
        </div>
        <div className="flex h-36 items-end justify-between gap-2">
          {months.map((mo, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-lg bg-primary/80 transition-all"
                  style={{
                    height: `${Math.max((mo.profit / maxP) * 100, 3)}%`,
                  }}
                  title={usd(mo.profit)}
                />
              </div>
              <span className="text-[10px] capitalize text-muted-foreground">
                {mo.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Este mes */}
      <div>
        <h2 className="mb-2 text-sm font-bold text-foreground">Este mes</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Enviado"
            value={usd(thisMonth.sent)}
            hint={`${thisMonth.count} remesas`}
          />
          <Stat label="Ganancia" value={usd(thisMonth.profit)} tone="positive" />
          <Stat label="Tu parte" value={usd(thisMonth.mine)} tone="positive" />
          <Stat label="Parte del socio" value={usd(thisMonth.partner)} />
        </div>
      </div>

      {/* Histórico */}
      <div>
        <h2 className="mb-2 text-sm font-bold text-foreground">Histórico total</h2>
        <Card className="space-y-2">
          <Row label="Remesas" value={String(total.count)} />
          <Row label="Total enviado" value={usd(total.sent)} />
          <Row label="Ganancia total" value={usd(total.profit)} strong />
          <Row label="Tu parte" value={usd(total.mine)} />
          <Row label="Parte del socio" value={usd(total.partner)} />
        </Card>
      </div>

      {/* Por método de pago */}
      <div>
        <h2 className="mb-2 text-sm font-bold text-foreground">
          Por método de pago
        </h2>
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
      <span
        className={
          "tabular " +
          (strong ? "font-bold text-foreground" : "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
