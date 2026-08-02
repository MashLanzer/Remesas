import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Check, Clock } from "lucide-react";
import { getOperatorVaquitas, getSessionContext } from "@/lib/data";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { VaquitaConfirmButton } from "@/components/vaquita-confirm-button";
import { usd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OperadorVaquitasPage() {
  const ctx = await getSessionContext();
  if (ctx.isCliente) redirect("/");
  const vaquitas = await getOperatorVaquitas();

  return (
    <div>
      <Link
        href="/gestion"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Gestión
      </Link>
      <PageHeader
        title="Vaquitas familiares"
        subtitle="Botes que juntan varios para un mismo envío"
      />

      {vaquitas.length === 0 ? (
        <EmptyState
          title="Sin vaquitas"
          description="Cuando un cliente cree una vaquita, aparecerá aquí con sus aportes."
        />
      ) : (
        <div className="space-y-3">
          {vaquitas.map((v) => {
            const goal = Number(v.goal_usd) || 0;
            const pct = goal > 0 ? Math.min(100, (v.raised / goal) * 100) : 0;
            return (
              <Card key={v.id} className="space-y-3 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                      <Users className="h-4 w-4 shrink-0 text-primary" />
                      {v.title || `Para ${v.beneficiary_name}`}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Recibe {v.beneficiary_name}
                      {v.province ? ` · ${v.province}` : ""} ·{" "}
                      {v.delivery_currency}
                    </p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                      (v.status === "enviada"
                        ? "bg-income/10 text-income"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {v.status === "enviada" ? "Enviada" : "Abierta"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${goal > 0 ? pct : v.raised > 0 ? 100 : 0}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-foreground">
                    {usd(v.raised)}
                    {goal > 0 ? ` / ${usd(goal)}` : ""}
                  </span>
                </div>

                {v.contributions.length > 0 && (
                  <div className="space-y-1.5 border-t border-border pt-2.5">
                    {v.contributions.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        {c.proof_url ? (
                          <a
                            href={c.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.proof_url}
                              alt="Comprobante"
                              className="h-9 w-9 rounded-md object-cover"
                            />
                          </a>
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                            {c.contributor_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {c.contributor_name}
                          </p>
                          <p className="text-[11px]">
                            {c.status === "confirmado" ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-income">
                                <Check className="h-3 w-3" /> Confirmado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" /> Por confirmar
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="shrink-0 font-bold text-foreground">
                          {usd(Number(c.amount_usd))}
                        </span>
                        {c.status !== "confirmado" && (
                          <VaquitaConfirmButton id={c.id} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
