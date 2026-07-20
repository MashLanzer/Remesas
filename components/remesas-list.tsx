"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Send, Check } from "lucide-react";
import { Card, Badge, EmptyState } from "@/components/ui";
import { usd, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { updateRemittanceStatus } from "@/app/actions";
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

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const yest = new Date(now.getTime() - 86400000);
  if (d.toDateString() === now.toDateString()) return "Hoy";
  if (d.toDateString() === yest.toDateString()) return "Ayer";
  return formatDate(dateStr);
}

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

  const totalSent = list.reduce((s, r) => s + Number(r.amount_usd), 0);
  const totalProfit = list.reduce((s, r) => s + Number(r.total_profit), 0);

  // Agrupar por fecha (la lista ya viene ordenada desc por fecha).
  const groups = useMemo(() => {
    const out: { label: string; items: Remittance[] }[] = [];
    for (const r of list) {
      const label = dateLabel(r.date);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(r);
      else out.push({ label, items: [r] });
    }
    return out;
  }, [list]);

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
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
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

      {/* Barra de totales del filtro */}
      {list.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              Enviado ({list.length})
            </p>
            <p className="tabular text-lg font-bold text-foreground">
              {usd(totalSent)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              Ganancia
            </p>
            <p className="tabular text-lg font-bold text-income">
              {usd(totalProfit)}
            </p>
          </div>
        </div>
      )}

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
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {g.label}
              </p>
              <div className="space-y-2">
                {g.items.map((r) => (
                  <RemesaCard key={r.id} r={r} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RemesaCard({ r }: { r: Remittance }) {
  const [pending, start] = useTransition();

  return (
    <Card className="p-3.5">
      <div className="flex items-center justify-between">
        <Link
          href={`/remesas/${r.id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Send className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {r.beneficiary?.name || r.client?.name || "Remesa"}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.payment_method || "Sin método"}
            </p>
          </div>
        </Link>
        <div className="flex flex-col items-end gap-1">
          <span className="tabular text-sm font-bold text-foreground">
            {usd(r.amount_usd)}
          </span>
          <Badge tone={statusTone[r.status]}>{r.status}</Badge>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
        <span className="text-muted-foreground">
          Ganancia {usd(r.total_profit)} · Tu parte {usd(r.my_share)}
        </span>
        {r.status === "pendiente" && (
          <button
            disabled={pending}
            onClick={() =>
              start(() => updateRemittanceStatus(r.id, "entregado"))
            }
            className="inline-flex items-center gap-1 rounded-full bg-income/10 px-2.5 py-1 font-semibold text-income transition active:scale-95 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Entregar
          </button>
        )}
      </div>
    </Card>
  );
}
