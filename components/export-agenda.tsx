"use client";

import { useState } from "react";
import { Download, Check } from "lucide-react";
import type { Client, Beneficiary } from "@/lib/types";

function cell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(name: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(cell).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportAgenda({
  clients,
  beneficiaries,
}: {
  clients: Client[];
  beneficiaries: Beneficiary[];
}) {
  const [done, setDone] = useState<string | null>(null);
  const nameById = new Map(clients.map((c) => [c.id, c.name]));

  function flash(k: string) {
    setDone(k);
    setTimeout(() => setDone(null), 2500);
  }

  function exportClients() {
    download("clientes.csv", [
      ["Nombre", "Teléfono", "País", "Notas"],
      ...clients.map((c) => [
        c.name,
        c.phone ?? "",
        (c as { country?: string | null }).country ?? "",
        c.notes ?? "",
      ]),
    ]);
    flash("c");
  }

  function exportBeneficiaries() {
    download("beneficiarios.csv", [
      ["Nombre", "Provincia", "Teléfono", "Carnet", "Moneda", "Cliente"],
      ...beneficiaries.map((b) => [
        b.name,
        b.province ?? "",
        b.phone ?? "",
        b.id_card ?? "",
        b.preferred_currency ?? "",
        b.client_id ? nameById.get(b.client_id) ?? "" : "",
      ]),
    ]);
    flash("b");
  }

  return (
    <div className="space-y-3">
      <Row
        label="Exportar clientes (CSV)"
        sub={`${clients.length} registros`}
        done={done === "c"}
        onClick={exportClients}
        disabled={clients.length === 0}
      />
      <div className="border-t border-border" />
      <Row
        label="Exportar beneficiarios (CSV)"
        sub={`${beneficiaries.length} registros`}
        done={done === "b"}
        onClick={exportBeneficiaries}
        disabled={beneficiaries.length === 0}
      />
    </div>
  );
}

function Row({
  label,
  sub,
  done,
  onClick,
  disabled,
}: {
  label: string;
  sub: string;
  done: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
          <Download className="h-5 w-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{sub} · se abre en Excel</p>
        </div>
      </div>
      {done && <Check className="h-5 w-5 text-income" />}
    </button>
  );
}
