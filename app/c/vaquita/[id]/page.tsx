import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Check, Clock } from "lucide-react";
import { getVaquita } from "@/lib/data";
import { Card } from "@/components/ui";
import { VaquitaShare } from "@/components/vaquita-share";
import { VaquitaConvert } from "@/components/vaquita-convert";
import { usd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VaquitaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getVaquita(id);
  if (!data) notFound();
  const { vaquita: v, contributions, raised } = data;
  const goal = Number(v.goal_usd) || 0;
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const sent = v.status === "enviada";
  const confirmedTotal = contributions
    .filter((c) => c.status === "confirmado")
    .reduce((s, c) => s + Number(c.amount_usd), 0);
  const allConfirmed =
    contributions.length > 0 &&
    contributions.every((c) => c.status === "confirmado");

  return (
    <div className="space-y-5">
      <Link
        href="/c/vaquita"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Mis vaquitas
      </Link>

      {/* Cabecera + progreso */}
      <Card className="space-y-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Users className="h-3.5 w-3.5" /> Vaquita familiar
          </p>
          <h1 className="mt-1 text-lg font-bold text-foreground">
            {v.title || `Para ${v.beneficiary_name}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Para {v.beneficiary_name}
            {v.province ? ` · ${v.province}` : ""}
          </p>
        </div>
        <div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-extrabold text-foreground">{usd(raised)}</p>
            {goal > 0 && (
              <p className="text-sm text-muted-foreground">meta {usd(goal)}</p>
            )}
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${goal > 0 ? pct : raised > 0 ? 100 : 0}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {contributions.length} aporte{contributions.length === 1 ? "" : "s"}
          </p>
        </div>
      </Card>

      {/* Compartir / convertir */}
      {sent ? (
        <Card className="flex items-center gap-3 border-income/30 bg-income/10">
          <Check className="h-5 w-5 shrink-0 text-income" />
          <p className="text-sm font-semibold text-income">
            Esta vaquita ya se convirtió en un envío.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          <VaquitaShare token={v.share_token} title={v.beneficiary_name} />
          <VaquitaConvert
            id={v.id}
            total={confirmedTotal}
            allConfirmed={allConfirmed}
            hasContributions={contributions.length > 0}
          />
        </div>
      )}

      {/* Aportes */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Aportes
        </h2>
        {contributions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Aún nadie ha aportado. Comparte el enlace con tu familia.
          </p>
        ) : (
          <div className="space-y-2">
            {contributions.map((c) => (
              <Card key={c.id} className="flex items-center gap-3 p-3">
                {c.proof_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.proof_url}
                    alt="Comprobante"
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {c.contributor_name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {c.contributor_name}
                  </p>
                  <p className="text-xs">
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
                <span className="shrink-0 text-sm font-bold text-foreground">
                  {usd(Number(c.amount_usd))}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
