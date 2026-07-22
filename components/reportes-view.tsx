"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Share2,
  Printer,
  Target,
  CalendarClock,
  UserX,
  BarChart3,
  Users,
  PieChart,
  ArrowLeftRight,
} from "lucide-react";
import { Card, Select } from "@/components/ui";
import { Sheet, SheetTrigger } from "@/components/sheet";
import { usd, localAmount, cn } from "@/lib/utils";
import type { Remittance } from "@/lib/types";

type Period = "mes" | "pasado" | "anio" | "todo";

const periods: { key: Period; label: string }[] = [
  { key: "mes", label: "Este mes" },
  { key: "pasado", label: "Mes pasado" },
  { key: "anio", label: "Este año" },
  { key: "todo", label: "Todo" },
];

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const INACTIVE_DAYS = 21;

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

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-ES", {
    month: "short",
    year: "numeric",
  });
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00").getTime();
  return Math.floor((Date.now() - d) / 86400000);
}

export function ReportesView({
  remittances,
  monthlyGoal = 0,
}: {
  remittances: Remittance[];
  monthlyGoal?: number;
}) {
  const [period, setPeriod] = useState<Period>("mes");
  const [curFilter, setCurFilter] = useState<string>("");
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [sheet, setSheet] = useState<
    null | "trend" | "clients" | "desglose" | "compare"
  >(null);

  // Opciones de filtro derivadas de todos los datos
  const currencyOptions = useMemo(
    () => Array.from(new Set(remittances.map((r) => r.delivery_currency))).sort(),
    [remittances]
  );
  const methodOptions = useMemo(
    () =>
      Array.from(
        new Set(remittances.map((r) => r.payment_method).filter(Boolean))
      ).sort() as string[],
    [remittances]
  );

  const matchFilters = (r: Remittance) =>
    (!curFilter || r.delivery_currency === curFilter) &&
    (!methodFilter || (r.payment_method || "") === methodFilter);

  const cur = useMemo(
    () =>
      remittances.filter((r) => inPeriod(r.date, period, 0) && matchFilters(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remittances, period, curFilter, methodFilter]
  );
  const prev = useMemo(
    () =>
      remittances.filter((r) => inPeriod(r.date, period, 1) && matchFilters(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remittances, period, curFilter, methodFilter]
  );

  const a = agg(cur);
  const p = agg(prev);
  const avg = a.count ? a.sent / a.count : 0;
  const showCompare = period !== "todo";

  // Meses disponibles (para el comparador y la tendencia)
  const allMonths = useMemo(() => {
    const keys = Array.from(new Set(remittances.map((r) => monthKey(r.date))));
    return keys.sort((x, y) => y.localeCompare(x)); // más reciente primero
  }, [remittances]);

  // #1 Tendencia — enviado vs ganancia (últimos 6 meses)
  const trend = useMemo(() => {
    const now = new Date();
    const out: { label: string; sent: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const base = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
      const list = remittances.filter((r) => monthKey(r.date) === key);
      out.push({
        label: base.toLocaleDateString("es-ES", { month: "short" }),
        sent: list.reduce((s, r) => s + Number(r.amount_usd), 0),
        profit: list.reduce((s, r) => s + Number(r.total_profit), 0),
      });
    }
    return out;
  }, [remittances]);

  // #4 Día de la semana con más actividad
  const byDay = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ count: 0, sent: 0 }));
    for (const r of cur) {
      const d = new Date(r.date + "T00:00:00").getDay();
      buckets[d].count += 1;
      buckets[d].sent += Number(r.amount_usd);
    }
    return [1, 2, 3, 4, 5, 6, 0].map((i) => ({
      label: DAY_NAMES[i],
      ...buckets[i],
    }));
  }, [cur]);
  const maxDay = Math.max(...byDay.map((d) => d.count), 1);

  // Rankings
  const topClients = useMemo(() => rank(cur, "client"), [cur]);
  const byProvince = useMemo(() => rank(cur, "province"), [cur]);

  // #6 Rentabilidad por cliente (mejor margen)
  const byMargin = useMemo(() => {
    const m: Record<string, { sent: number; profit: number; count: number }> = {};
    for (const r of cur) {
      const key = r.client?.name || "Sin cliente";
      const s = (m[key] ??= { sent: 0, profit: 0, count: 0 });
      s.sent += Number(r.amount_usd);
      s.profit += Number(r.total_profit);
      s.count += 1;
    }
    return Object.entries(m)
      .filter(([, v]) => v.sent > 0)
      .map(([name, v]) => ({ name, ...v, margin: (v.profit / v.sent) * 100 }))
      .sort((x, y) => y.margin - x.margin)
      .slice(0, 5);
  }, [cur]);

  // #5 Clientes que dejaron de enviar (sobre todo el histórico)
  const inactive = useMemo(() => {
    const m: Record<string, { last: string; count: number }> = {};
    for (const r of remittances) {
      const key = r.client?.name || null;
      if (!key) continue;
      const s = (m[key] ??= { last: r.date, count: 0 });
      s.count += 1;
      if (r.date > s.last) s.last = r.date;
    }
    return Object.entries(m)
      .map(([name, v]) => ({ name, ...v, days: daysSince(v.last) }))
      .filter((c) => c.count >= 2 && c.days >= INACTIVE_DAYS)
      .sort((x, y) => y.days - x.days)
      .slice(0, 6);
  }, [remittances]);

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

  // #8 Proyección de cierre de mes (solo período "mes")
  const projection = useMemo(() => {
    if (period !== "mes") return null;
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const elapsed = Math.max(now.getDate(), 1);
    if (elapsed >= daysInMonth) return null;
    const factor = daysInMonth / elapsed;
    return {
      profit: a.profit * factor,
      sent: a.sent * factor,
      daysLeft: daysInMonth - now.getDate(),
    };
  }, [period, a.profit, a.sent]);

  // #3 Meta mensual (solo período "mes")
  const goalPct =
    period === "mes" && monthlyGoal > 0
      ? Math.min((a.profit / monthlyGoal) * 100, 100)
      : null;

  // #2 Comparador de dos meses
  const [cmpA, setCmpA] = useState<string>(() => allMonths[0] ?? "");
  const [cmpB, setCmpB] = useState<string>(() => allMonths[1] ?? allMonths[0] ?? "");
  const cmpAData = useMemo(
    () => agg(remittances.filter((r) => monthKey(r.date) === cmpA)),
    [remittances, cmpA]
  );
  const cmpBData = useMemo(
    () => agg(remittances.filter((r) => monthKey(r.date) === cmpB)),
    [remittances, cmpB]
  );

  const periodLabel = periods.find((x) => x.key === period)?.label ?? "";

  function summaryText(): string {
    const lines = [
      `📊 Reporte — ${periodLabel}`,
      `Enviado: ${usd(a.sent)} (${a.count} remesas)`,
      `Ganancia: ${usd(a.profit)}`,
      `Tu parte: ${usd(a.mine)}`,
      `Comisión: ${usd(a.commission)}`,
      `Ticket promedio: ${usd(avg)}`,
    ];
    if (topClients.length)
      lines.push(`Top cliente: ${topClients[0].name} (${usd(topClients[0].profit)})`);
    return lines.join("\n");
  }

  async function shareSummary() {
    const text = summaryText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Reporte", text });
        return;
      }
    } catch {
      /* usuario canceló o no disponible */
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("Resumen copiado al portapapeles");
    } catch {
      /* nada */
    }
  }

  function exportCsv() {
    const lines: string[] = [];
    lines.push(`Reporte,${periodLabel}`);
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

      {/* #9 Filtros moneda / método */}
      {(currencyOptions.length > 1 || methodOptions.length > 1) && (
        <div className="flex gap-2">
          <Select
            title="Moneda"
            value={curFilter}
            onChange={(e) => setCurFilter(e.target.value)}
            className="flex-1 bg-card px-3 py-2"
          >
            <option value="">Todas las monedas</option>
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            title="Método"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="flex-1 bg-card px-3 py-2"
          >
            <option value="">Todos los métodos</option>
            {methodOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* #3 Meta mensual */}
      {goalPct != null && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Target className="h-4 w-4 text-primary" /> Meta del mes
            </p>
            <p className="tabular text-sm font-semibold text-foreground">
              {usd(a.profit)} / {usd(monthlyGoal)}
            </p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {goalPct >= 100
              ? "¡Meta alcanzada! 🎉"
              : `${Math.round(goalPct)}% · faltan ${usd(
                  Math.max(monthlyGoal - a.profit, 0)
                )}`}
          </p>
        </Card>
      )}

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

      {/* #8 Proyección */}
      {projection && (
        <Card className="flex items-center gap-3 border-info/30 bg-info/5 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Proyección de cierre
            </p>
            <p className="text-xs text-muted-foreground">
              Al ritmo actual cerrarías el mes con{" "}
              <span className="font-semibold text-income">
                {usd(projection.profit)}
              </span>{" "}
              de ganancia ({usd(projection.sent)} enviado) · quedan{" "}
              {projection.daysLeft} días.
            </p>
          </div>
        </Card>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <Mini label="Tu parte" value={usd(a.mine)} />
        <Mini label="Comisión" value={usd(a.commission)} />
        <Mini label="Promedio" value={usd(avg)} />
      </div>

      {/* Análisis detallado en hojas (menos scroll) */}
      <div className="space-y-2">
        <SheetTrigger
          icon={BarChart3}
          title="Tendencia y actividad"
          subtitle="6 meses y días más activos"
          onClick={() => setSheet("trend")}
        />
        {(topClients.length > 0 || byMargin.length > 0 || inactive.length > 0) && (
          <SheetTrigger
            icon={Users}
            title="Clientes"
            subtitle="Top, rentabilidad e inactivos"
            onClick={() => setSheet("clients")}
          />
        )}
        {(byProvince.length > 0 || byCurrency.length > 0 || byMethod.length > 0) && (
          <SheetTrigger
            icon={PieChart}
            title="Desglose"
            subtitle="Provincia, moneda y método"
            onClick={() => setSheet("desglose")}
          />
        )}
        {allMonths.length >= 2 && (
          <SheetTrigger
            icon={ArrowLeftRight}
            title="Comparar meses"
            subtitle="Dos meses lado a lado"
            onClick={() => setSheet("compare")}
          />
        )}
      </div>

      {/* Hoja: Tendencia y actividad */}
      <Sheet
        open={sheet === "trend"}
        onClose={() => setSheet(null)}
        title="Tendencia y actividad"
      >
        <div className="space-y-5">
      {/* #1 Tendencia enviado vs ganancia */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Tendencia (6 meses)</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-info" /> Enviado
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-income" /> Ganancia
            </span>
          </div>
        </div>
        <TrendChart data={trend} />
        <p className="mt-2 text-[10px] text-muted-foreground">
          Escalas independientes por línea.
        </p>
      </Card>

      {/* #4 Día de la semana */}
      {a.count > 0 && (
        <Card>
          <p className="mb-3 text-sm font-bold text-foreground">
            Días con más actividad
          </p>
          <div className="flex h-24 items-end justify-between gap-1.5">
            {byDay.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-primary/70"
                    style={{ height: `${Math.max((d.count / maxDay) * 100, 4)}%` }}
                    title={`${d.count} remesas · ${usd(d.sent)}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

        </div>
      </Sheet>

      {/* Hoja: Clientes */}
      <Sheet
        open={sheet === "clients"}
        onClose={() => setSheet(null)}
        title="Clientes"
      >
        <div className="space-y-5">
      {/* Top clientes */}
      {topClients.length > 0 && (
        <RankCard
          title="Top clientes"
          rows={topClients.map((c) => ({ name: c.name, value: c.profit }))}
        />
      )}

      {/* #6 Mejor margen */}
      {byMargin.length > 0 && (
        <Card>
          <p className="mb-3 text-sm font-bold text-foreground">
            Mejor rentabilidad
          </p>
          <div className="space-y-2.5">
            {byMargin.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="truncate text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {usd(c.profit)} de {usd(c.sent)}
                  </p>
                </div>
                <span className="tabular ml-2 shrink-0 rounded-full bg-income/10 px-2 py-0.5 text-xs font-semibold text-income">
                  {c.margin.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* #5 Clientes inactivos */}
      {inactive.length > 0 && (
        <Card>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-foreground">
            <UserX className="h-4 w-4 text-warning" /> Dejaron de enviar
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            Clientes habituales sin remesas hace {INACTIVE_DAYS}+ días.
          </p>
          <div className="space-y-2">
            {inactive.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="truncate text-foreground">{c.name}</span>
                <span className="ml-2 shrink-0 text-xs text-warning">
                  hace {c.days} días
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

        </div>
      </Sheet>

      {/* Hoja: Desglose */}
      <Sheet
        open={sheet === "desglose"}
        onClose={() => setSheet(null)}
        title="Desglose"
      >
        <div className="space-y-5">
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

        </div>
      </Sheet>

      {/* Hoja: Comparar meses */}
      <Sheet
        open={sheet === "compare"}
        onClose={() => setSheet(null)}
        title="Comparar meses"
      >
      {/* #2 Comparar dos meses */}
      {allMonths.length >= 2 && (
        <Card>
          <p className="mb-3 text-sm font-bold text-foreground">Comparar meses</p>
          <div className="grid grid-cols-2 gap-3">
            <CompareColumn
              months={allMonths}
              value={cmpA}
              onChange={setCmpA}
              data={cmpAData}
            />
            <CompareColumn
              months={allMonths}
              value={cmpB}
              onChange={setCmpB}
              data={cmpBData}
            />
          </div>
        </Card>
      )}

      </Sheet>

      {/* Acciones */}
      <div className="grid grid-cols-3 gap-2">
        <ActionButton onClick={exportCsv} icon={<Download className="h-4 w-4" />}>
          CSV
        </ActionButton>
        <ActionButton
          onClick={() => window.print()}
          icon={<Printer className="h-4 w-4" />}
        >
          PDF
        </ActionButton>
        <ActionButton onClick={shareSummary} icon={<Share2 className="h-4 w-4" />}>
          Compartir
        </ActionButton>
      </div>

      {/* #7 Bloque imprimible (oculto en pantalla, visible al imprimir) */}
      <div className="print-report">
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Reporte — {periodLabel}
        </h1>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
          {curFilter || "Todas las monedas"} · {methodFilter || "Todos los métodos"}
        </p>
        <PrintRow label="Remesas" value={String(a.count)} />
        <PrintRow label="Enviado" value={usd(a.sent)} />
        <PrintRow label="Ganancia" value={usd(a.profit)} />
        <PrintRow label="Tu parte" value={usd(a.mine)} />
        <PrintRow label="Comisión total" value={usd(a.commission)} />
        <PrintRow label="Ticket promedio" value={usd(avg)} />
        {topClients.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 8px" }}>
              Top clientes
            </h2>
            {topClients.map((c) => (
              <PrintRow key={c.name} label={c.name} value={usd(c.profit)} />
            ))}
          </>
        )}
      </div>
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

function TrendChart({
  data,
}: {
  data: { label: string; sent: number; profit: number }[];
}) {
  const W = 300;
  const H = 110;
  const pad = 6;
  const n = data.length;
  const maxSent = Math.max(...data.map((d) => d.sent), 1);
  const maxProfit = Math.max(...data.map((d) => d.profit), 1);
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(n - 1, 1);
  const y = (v: number, max: number) => H - pad - (v / max) * (H - pad * 2);
  const line = (vals: number[], max: number) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v, max)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full" preserveAspectRatio="none">
      <path
        d={line(data.map((d) => d.sent), maxSent)}
        fill="none"
        stroke="hsl(var(--info))"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={line(data.map((d) => d.profit), maxProfit)}
        fill="none"
        stroke="hsl(var(--income))"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.sent, maxSent)} r={2.5} fill="hsl(var(--info))" />
          <circle
            cx={x(i)}
            cy={y(d.profit, maxProfit)}
            r={2.5}
            fill="hsl(var(--income))"
          />
          <text
            x={x(i)}
            y={H + 12}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px] capitalize"
          >
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function CompareColumn({
  months,
  value,
  onChange,
  data,
}: {
  months: string[];
  value: string;
  onChange: (v: string) => void;
  data: ReturnType<typeof agg>;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <Select
        title="Mes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mb-2 rounded-lg bg-card px-2 py-1 text-xs font-semibold capitalize"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </Select>
      <div className="space-y-1.5">
        <CmpRow label="Enviado" value={usd(data.sent)} />
        <CmpRow label="Ganancia" value={usd(data.profit)} tone />
        <CmpRow label="Remesas" value={String(data.count)} />
      </div>
    </div>
  );
}

function CmpRow({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={"tabular font-semibold " + (tone ? "text-income" : "text-foreground")}
      >
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-foreground transition active:scale-[0.98]"
    >
      {icon}
      {children}
    </button>
  );
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
      <p
        className={
          "tabular mt-1 text-2xl font-bold " +
          (tone ? "text-income" : "text-foreground")
        }
      >
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
                className={
                  "h-full rounded-full " + (field === "sent" ? "bg-info" : "bg-income")
                }
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

function PrintRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
        borderBottom: "1px solid #eee",
        fontSize: 13,
      }}
    >
      <span style={{ color: "#555" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
