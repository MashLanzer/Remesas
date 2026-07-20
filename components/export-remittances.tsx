"use client";

import { useState } from "react";
import { Download, Check } from "lucide-react";
import type { Remittance } from "@/lib/types";

function cell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ExportRemittances({
  remittances,
}: {
  remittances: Remittance[];
}) {
  const [done, setDone] = useState(false);

  function exportCsv() {
    const headers = [
      "Fecha",
      "Cliente",
      "Beneficiario",
      "Monto USD",
      "Comisión",
      "Total cobrado",
      "Método",
      "Moneda",
      "Tasa",
      "Monto local",
      "Ganancia total",
      "Tu parte",
      "Parte socio",
      "Estado",
    ];
    const rows = remittances.map((r) =>
      [
        r.date,
        r.client?.name,
        r.beneficiary?.name,
        r.amount_usd,
        r.commission,
        r.total_received,
        r.payment_method,
        r.delivery_currency,
        r.exchange_rate,
        r.local_amount,
        r.total_profit,
        r.my_share,
        r.partner_share,
        r.status,
      ]
        .map(cell)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "remesas.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <button
      onClick={exportCsv}
      disabled={remittances.length === 0}
      className="flex w-full items-center justify-between disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
          <Download className="h-5 w-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">
            Exportar remesas (CSV)
          </p>
          <p className="text-xs text-muted-foreground">
            {remittances.length} registros · se abre en Excel
          </p>
        </div>
      </div>
      {done && <Check className="h-5 w-5 text-income" />}
    </button>
  );
}
