"use client";

import { Download } from "lucide-react";
import type { Remittance } from "@/lib/types";

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Exporta las entregas del repartidor (con su ganancia) a CSV.
export function ExportMyDeliveries({ remittances }: { remittances: Remittance[] }) {
  function exportCsv() {
    const headers = [
      "Fecha",
      "Beneficiario",
      "Provincia",
      "Monto USD",
      "Entregado",
      "Moneda",
      "Estado",
      "Tu ganancia",
    ];
    const rows = remittances.map((r) =>
      [
        r.date,
        r.beneficiary?.name ?? "",
        r.beneficiary?.province ?? "",
        Number(r.amount_usd),
        Number(r.local_amount),
        r.delivery_currency,
        r.status,
        Number(r.partner_share),
      ]
        .map(csvCell)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mis-entregas-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      disabled={remittances.length === 0}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition active:scale-[0.98] disabled:opacity-50"
    >
      <Download className="h-4 w-4" /> Exportar mis entregas (CSV)
    </button>
  );
}
