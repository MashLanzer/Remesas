"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FinanzasTabs({
  cuentas,
  reportes,
  initial = "cuentas",
}: {
  cuentas: ReactNode;
  reportes: ReactNode;
  initial?: "cuentas" | "reportes";
}) {
  const [tab, setTab] = useState<"cuentas" | "reportes">(initial);

  return (
    <div>
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
