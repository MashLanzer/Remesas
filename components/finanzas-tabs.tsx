"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Kpi = {
  label: string;
  value: string;
  tone?: string;
  target?: string; // id del bloque al que baja al tocar (en Cuentas)
};

export function FinanzasTabs({
  cuentas,
  reportes,
  initial = "cuentas",
  kpis = [],
}: {
  cuentas: ReactNode;
  reportes: ReactNode;
  initial?: "cuentas" | "reportes";
  kpis?: Kpi[];
}) {
  const [tab, setTab] = useState<"cuentas" | "reportes">(initial);

  function goTo(target: string) {
    setTab("cuentas");
    setTimeout(() => {
      document
        .getElementById(target)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }

  return (
    <div>
      {kpis.length > 0 && (
        <div
          className={cn(
            "mb-4 grid gap-2",
            kpis.length >= 3 ? "grid-cols-3" : "grid-cols-2"
          )}
        >
          {kpis.map((k) => (
            <Kpi key={k.label} kpi={k} onGo={goTo} />
          ))}
        </div>
      )}

      <div className="mb-5 flex gap-1 rounded-2xl bg-muted p-1">
        <Pill active={tab === "cuentas"} onClick={() => setTab("cuentas")}>
          Cuentas
        </Pill>
        <Pill active={tab === "reportes"} onClick={() => setTab("reportes")}>
          Reportes
        </Pill>
      </div>

      <div className={tab === "cuentas" ? "" : "hidden"}>{cuentas}</div>
      <div className={tab === "reportes" ? "" : "hidden"}>{reportes}</div>
    </div>
  );
}

function Kpi({
  kpi,
  onGo,
}: {
  kpi: Kpi;
  onGo: (target: string) => void;
}) {
  const color =
    kpi.tone === "income"
      ? "text-income"
      : kpi.tone === "warning"
      ? "text-warning"
      : kpi.tone === "destructive"
      ? "text-destructive"
      : "text-foreground";
  const inner = (
    <>
      <p className="text-[11px] font-medium text-muted-foreground">
        {kpi.label}
      </p>
      <p className={"tabular mt-1 truncate text-base font-bold " + color}>
        {kpi.value}
      </p>
    </>
  );
  const base =
    "rounded-2xl border border-border bg-card p-3 text-center transition";
  if (kpi.target) {
    return (
      <button
        onClick={() => onGo(kpi.target!)}
        className={cn(base, "active:scale-[0.98]")}
      >
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-xl py-2 text-sm font-semibold transition",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}
