import Link from "next/link";
import { Plus } from "lucide-react";
import { getRemittances } from "@/lib/data";
import { usd, formatDate } from "@/lib/utils";
import { Card, Badge, LinkButton, EmptyState, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { RemittanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

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

export default async function RemesasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado = "todas" } = await searchParams;
  const all = await getRemittances();
  const list = estado === "todas" ? all : all.filter((r) => r.status === estado);

  return (
    <div>
      <PageHeader
        title="Remesas"
        subtitle={`${all.length} en total`}
        action={
          <LinkButton href="/remesas/nueva">
            <Plus className="h-4 w-4" /> Nueva
          </LinkButton>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "todas" ? "/remesas" : `/remesas?estado=${f.key}`}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition",
              estado === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No hay remesas aquí"
          description="Cuando registres envíos aparecerán en esta lista."
          action={
            <LinkButton href="/remesas/nueva">
              <Plus className="h-4 w-4" /> Registrar remesa
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <Link key={r.id} href={`/remesas/${r.id}`}>
              <Card className="p-3.5 transition hover:border-ring">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.beneficiary?.name || r.client?.name || "Remesa"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.date)}
                      {r.payment_method ? ` · ${r.payment_method}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-foreground">
                      {usd(r.amount_usd)}
                    </span>
                    <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <span>Ganancia {usd(r.total_profit)}</span>
                  <span className="text-income">Tu parte {usd(r.my_share)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
