"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Send } from "lucide-react";
import { Card, Badge, EmptyState } from "@/components/ui";
import { usd, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Remittance, RemittanceStatus } from "@/lib/types";

const statusTone: Record<RemittanceStatus, "amber" | "emerald" | "blue"> = {
  pendiente: "amber",
  entregado: "emerald",
  liquidado: "blue",
};

const filters: { key: string; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "pendiente", label: "Pendientes" },
  { key: "entregado", label: "Entregadas" },
  { key: "liquidado", label: "Liquidadas" },
];

export function RemesasList({ remittances }: { remittances: Remittance[] }) {
  const [estado, setEstado] = useState("todas");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return remittances.filter((r) => {
      if (estado !== "todas" && r.status !== estado) return false;
      if (!term) return true;
      const hay = [
        r.beneficiary?.name,
        r.client?.name,
        r.beneficiary?.province,
        r.payment_method,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [remittances, estado, q]);

  return (
    <div>
      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por cliente, beneficiario…"
          className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setEstado(f.key)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
              estado === f.key
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={q ? "Sin resultados" : "No hay remesas aquí"}
          description={
            q
              ? "Prueba con otro nombre."
              : "Cuando registres envíos aparecerán en esta lista."
          }
          action={
            !q ? (
              <Link
                href="/remesas/nueva"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Registrar remesa
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <Link key={r.id} href={`/remesas/${r.id}`}>
              <Card className="p-3.5 transition active:scale-[0.99]">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Send className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {r.beneficiary?.name || r.client?.name || "Remesa"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.date)}
                        {r.payment_method ? ` · ${r.payment_method}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="tabular text-sm font-bold text-foreground">
                      {usd(r.amount_usd)}
                    </span>
                    <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <span>Ganancia {usd(r.total_profit)}</span>
                  <span className="font-semibold text-income">
                    Tu parte {usd(r.my_share)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
