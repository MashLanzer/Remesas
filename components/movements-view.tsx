"use client";

import { useMemo, useState } from "react";
import { Send, ArrowUpRight, ArrowDownLeft, Download } from "lucide-react";
import { Card } from "@/components/ui";
import { usd, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type Movement = {
  id: string;
  date: string;
  kind: "remesa" | "pago" | "recibo";
  label: string;
  delta: number;
};

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function MovementsView({ movements }: { movements: Movement[] }) {
  const [filter, setFilter] = useState<"todos" | "remesa" | "pago">("todos");

  // Serie del saldo en el tiempo (cronológica)
  const series = useMemo(() => {
    const asc = [...movements].sort((a, b) => a.date.localeCompare(b.date));
    let run = 0;
    return asc.map((m) => (run += m.delta));
  }, [movements]);

  const filtered = useMemo(
    () =>
      movements.filter((m) =>
        filter === "todos"
          ? true
          : filter === "remesa"
          ? m.kind === "remesa"
          : m.kind !== "remesa"
      ),
    [movements, filter]
  );

  function exportCsv() {
    const headers = ["Fecha", "Tipo", "Concepto", "Monto USD"];
    const rows = filtered.map((m) =>
      [m.date, m.kind, m.label, m.delta].map(csvCell).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "movimientos.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (movements.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Movimientos</h2>
        <button
          onClick={exportCsv}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
          aria-label="Exportar CSV"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Gráfico del saldo en el tiempo */}
      {series.length >= 2 && <BalanceChart series={series} />}

      {/* Filtro */}
      <div className="mb-3 flex gap-2">
        {(
          [
            { k: "todos", l: "Todos" },
            { k: "remesa", l: "Remesas" },
            { k: "pago", l: "Pagos" },
          ] as const
        ).map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filter === f.k
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            )}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 50).map((m) => (
          <Card key={m.id} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <span
                className={
                  "flex h-9 w-9 items-center justify-center rounded-full " +
                  (m.kind === "remesa"
                    ? "bg-warning/10 text-warning"
                    : m.kind === "pago"
                    ? "bg-info/10 text-info"
                    : "bg-income/10 text-income")
                }
              >
                {m.kind === "remesa" ? (
                  <Send className="h-4 w-4" />
                ) : m.kind === "pago" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownLeft className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
              </div>
            </div>
            <span
              className={
                "tabular text-sm font-bold " +
                (m.delta >= 0 ? "text-destructive" : "text-income")
              }
            >
              {m.delta >= 0 ? "+" : "−"}
              {usd(Math.abs(m.delta))}
            </span>
          </Card>
        ))}
      </div>
      <p className="mt-2 px-1 text-[11px] text-muted-foreground">
        + sube lo que debes · − lo que ya pagaste
      </p>
    </div>
  );
}

function BalanceChart({ series }: { series: number[] }) {
  const min = Math.min(...series, 0);
  const max = Math.max(...series, 1);
  const range = max - min || 1;
  const n = series.length;
  const pts = series.map((v, i) => {
    const x = (i / (n - 1)) * 100;
    const y = 38 - ((v - min) / range) * 34 - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = pts.join(" ");
  const area = `0,40 ${line} 100,40`;

  return (
    <Card className="mb-3 p-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        Saldo pendiente en el tiempo
      </p>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-20 w-full">
        <polygon points={area} fill="hsl(var(--primary))" opacity="0.12" />
        <polyline
          points={line}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Card>
  );
}
