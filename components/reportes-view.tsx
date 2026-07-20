"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import { Card } from "@/components/ui";
import { usd, localAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Remittance } from "@/lib/types";

type Period = "mes" | "pasado" | "anio" | "todo";

const periods: { key: Period; label: string }[] = [
  { key: "mes", label: "Este mes" },
  { key: "pasado", label: "Mes pasado" },
  { key: "anio", label: "Este año" },
  { key: "todo", label: "Todo" },
];

function inPeriod(dateStr: string, period: Period, offset = 0): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  if (period === "todo") return offset === 0;
  if (period === "anio") return d.getFullYear() === now.getFullYear() - offset;
  const monthsBack = (period === "pasado" ? 1 : 0) + offset;
  const base = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return (
    d.getFullYear() === base.getFullYear() && d.getMonth() === base.getMonth()
  );
}

function agg(list: Remittance[]) {
  return {
    count: list.length,
    sent: list.reduce((s, r) => s + Number(r.amount_usd), 0),
    profit: list.reduce((s, r) => s + Number(r.total_profit), 0),
    mine: list.reduce((s, r) => s + Number(r.my_share), 0),
    commission: list.reduce((s, r) => s + Number(r.commission), 0),
  };
}

export function ReportesView({ remittances }: { remittances: Remittance[] }) {
  const [period, setPeriod] = useState<Period>("mes");

  const cur = useMemo(
    () => remittances.filter((r) => inPeriod(r.date, period, 0)),
    [remittances, period]
  );
  const prev = useMemo(
    () => remittances.filter((r) => inPeriod(r.date, period, 1)),
    [remittances, period]
  );

  const a = agg(cur);
  const p = agg(prev);
  const avg = a.count ? a.sent / a.count : 0;

  // Gráfico: ganancia últimos 6 meses (fijo)
  const months = useMemo(() => {
    const now = new Date();
    const out: { label: string; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const base = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const profit = remittances
        .filter((r) => {
          const d = new Date(r.date + "T00:00:00");
          return (
            d.getFullYear() === base.getFullYear() &&
            d.getMonth() === base.getMonth()
          );
        })
        .reduce((s, r) => s + Number(r.total_profit), 0);
      out.push({
        label: base.toLocaleDateString("es-ES", { month: "short" }),
        profit,
      });
    }
    return out;
  }, [remittances]);
  const maxMonth = Math.max(...months.map((m) => m.profit), 1);

  // Rankings
  const topClients = useMemo(() => rank(cur, "client"), [cur]);
  const byProvince = useMemo(() => rank(cur, "province"), [cur]);
  const byCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of cur)
      m[r.delivery_currency] =
        (m[r.delivery_currency] || 0) + Number(r.local_amount);
    return Object.entries(m).sort((x, y) => y[1] - x[1]);
  }, [cur]);
  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of cur) {
      const k = r.payment_method || "Sin método";
      m[k] = (m[k] || 0) + Number(r.total_received);
    }
    return Object.entries(m).sort((x, y) => y[1] - x[1]);
  }, [cur]);

  function exportCsv() {
    const lines: string[] = [];
    lines.push(`Reporte,${periods.find((x) => x.key === period)?.label}`);
    lines.push("");
    lines.push("Métrica,Valor");
    lines.push(`Remesas,${a.count}`);
    lines.push(`Enviado,${a.sent}`);
    lines.push(`Ganancia,${a.profit}`);
    lines.push(`Tu parte,${a.mine}`);
    lines.push(`Comisión total,${a.commission}`);
    lines.push(`Ticket promedio,${avg.toFixed(2)}`);
    lines.push("");
    lines.push("Top clientes,Ganancia");
    topClients.forEach((c) => lines.push(`${csv(c.name)},${c.profit}`));
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reporte.csv";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  const showCompare = period !== "todo";

  return (
    <div className="space-y-5">
      {/* Período */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {periods.map((f) => (
          <button
            key={f.key}
            onClick={() => setPeriod(f.key)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
              period === f.key
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Enviado + Ganancia con comparativa */}
      <div className="grid grid-cols-2 gap-3">
        <BigStat
          label="Enviado"
          value={usd(a.sent)}
          hint={`${a.count} remesas`}
          delta={showCompare ? pctChange(a.sent, p.sent) : null}
        />
        <BigStat
          label="Ganancia"
          value={usd(a.profit)}
          tone
          delta={showCompare ? pctChange(a.profit, p.profit) : null}
        />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <Mini label="Tu parte" value={usd(a.mine)} />
        <Mini label="Comisión" value={usd(a.commission)} />
        <Mini label="Promedio" value={usd(avg)} />
      </div>

      {/* Gráfico mensual */}
      <Card>
        <p className="mb-4 text-sm font-bold text-foreground">
          Ganancia por mes
        </p>
        <div className="flex h-32 items-end justify-between gap-2">
          {months.map((mo, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-lg bg-primary/80"
                  style={{ height: `${Math.max((mo.profit / maxMonth) * 100, 3)}%` }}
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

      {/* Top clientes */}
      {topClients.length > 0 && (
        <RankCard title="Top clientes" rows={topClients.map((c) => ({ name: c.name, value: c.profit }))} />
      )}

      {/* Por provincia */}
      {byProvince.length > 0 && (
        <RankCard
          title="Por provincia"
          rows={byProvince.map((c) => ({ name: c.name, value: c.sent }))}
          field="sent"
        />
      )}

      {/* Por moneda */}
      {byCurrency.length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-bold text-foreground">
            Entregado por moneda
          </p>
          <div className="space-y-2">
            {byCurrency.map(([cur2, amt]) => (
              <Row key={cur2} label={cur2} value={`${localAmount(amt)} ${cur2}`} />
            ))}
          </div>
        </Card>
      )}

      {/* Por método */}
      {byMethod.length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-bold text-foreground">
            Por método de pago
          </p>
          <div className="space-y-2">
            {byMethod.map(([m, amt]) => (
              <Row key={m} label={m} value={usd(amt)} />
            ))}
          </div>
        </Card>
      )}

      <button
        onClick={exportCsv}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition active:scale-[0.98]"
      >
        <Download className="h-4 w-4" /> Exportar reporte (CSV)
      </button>
    </div>
  );
}

function rank(
  list: Remittance[],
  by: "client" | "province"
): { name: string; profit: number; sent: number; count: number }[] {
  const m: Record<string, { profit: number; sent: number; count: number }> = {};
  for (const r of list) {
    const key =
      by === "client"
        ? r.client?.name || "Sin cliente"
        : r.beneficiary?.province || "Sin provincia";
    const s = (m[key] ??= { profit: 0, sent: 0, count: 0 });
    s.profit += Number(r.total_profit);
    s.sent += Number(r.amount_usd);
    s.count += 1;
  }
  return Object.entries(m)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}

function csv(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function BigStat({
  label,
  value,
  hint,
  tone,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: boolean;
  delta?: number | null;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={"tabular mt-1 text-2xl font-bold " + (tone ? "text-income" : "text-foreground")}>
        {value}
      </p>
      {delta != null ? (
        <p
          className={
            "mt-1 flex items-center gap-1 text-xs font-medium " +
            (delta >= 0 ? "text-income" : "text-destructive")
          }
        >
          {delta >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {Math.abs(delta).toFixed(0)}% vs anterior
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-base font-bold text-foreground">{value}</p>
    </Card>
  );
}

function RankCard({
  title,
  rows,
  field,
}: {
  title: string;
  rows: { name: string; value: number }[];
  field?: "sent";
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Card>
      <p className="mb-3 text-sm font-bold text-foreground">{title}</p>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="truncate text-foreground">{r.name}</span>
              <span className="tabular ml-2 font-semibold text-foreground">
                {usd(r.value)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={"h-full rounded-full " + (field === "sent" ? "bg-info" : "bg-income")}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-medium text-foreground">{value}</span>
    </div>
  );
}
