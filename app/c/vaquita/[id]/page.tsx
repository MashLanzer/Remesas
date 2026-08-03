import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Check, Clock } from "lucide-react";
import { getVaquita } from "@/lib/data";
import { signDocMany } from "@/lib/storage";
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
  // Comprobantes de aporte: firmar las URLs (bucket privado) → mapa por id.
  const signedProofs = await signDocMany(contributions.map((c) => c.proof_url));
  const proofById: Record<string, string | null> = {};
  contributions.forEach((c, i) => {
    proofById[c.id] = signedProofs[i];
  });
  const goal = Number(v.goal_usd) || 0;
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const sent = v.status === "enviada";
  const confirmedTotal = contributions
    .filter((c) => c.status === "confirmado")
    .reduce((s, c) => s + Number(c.amount_usd), 0);
  const pendingTotal = raised - confirmedTotal;
  const confirmedCount = contributions.filter(
    (c) => c.status === "confirmado"
  ).length;
  const allConfirmed =
    contributions.length > 0 &&
    contributions.every((c) => c.status === "confirmado");

  // Barra de dos tonos: confirmado (sólido) + por confirmar (tenue), relativa a
  // la meta si la hay, si no al total recaudado.
  const denom = goal > 0 ? goal : raised;
  const confirmedPct = denom > 0 ? Math.min(100, (confirmedTotal / denom) * 100) : 0;
  const pendingPct =
    denom > 0 ? Math.min(100 - confirmedPct, (pendingTotal / denom) * 100) : 0;
  const remaining = goal > 0 ? Math.max(0, goal - raised) : 0;

  // Días restantes según la fecha límite.
  let daysLeft: number | null = null;
  if (v.deadline) {
    const diff = new Date(v.deadline + "T23:59:59").getTime() - Date.now();
    daysLeft = Math.ceil(diff / 86400000);
  }

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
            <div>
              <p className="text-2xl font-extrabold text-foreground">
                {usd(raised)}
              </p>
              <p className="text-[11px] text-muted-foreground">recaudado</p>
            </div>
            {goal > 0 && (
              <p className="text-sm text-muted-foreground">
                meta {usd(goal)} · {Math.round(pct)}%
              </p>
            )}
          </div>

          {/* Barra de dos tonos: confirmado + por confirmar */}
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${confirmedPct}%` }}
            />
            <div
              className="h-full bg-primary/40 transition-all"
              style={{ width: `${pendingPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" /> Confirmado
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary/40" /> Por confirmar
            </span>
          </div>
        </div>

        {/* Desglose */}
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Confirmado" value={usd(confirmedTotal)} tone="income" />
          <MiniStat label="Por confirmar" value={usd(pendingTotal)} tone="muted" />
          <MiniStat
            label={`Aporte${contributions.length === 1 ? "" : "s"}`}
            value={`${confirmedCount}/${contributions.length}`}
            tone="plain"
          />
        </div>

        {/* Meta / fecha límite */}
        {(goal > 0 || daysLeft != null) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {goal > 0 && (
              <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
                {remaining > 0
                  ? `Faltan ${usd(remaining)} para la meta`
                  : "🎉 ¡Meta alcanzada!"}
              </span>
            )}
            {daysLeft != null && (
              <span
                className={
                  "rounded-full px-2.5 py-1 font-medium " +
                  (daysLeft < 0
                    ? "bg-destructive/10 text-destructive"
                    : daysLeft <= 3
                    ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground")
                }
              >
                {daysLeft < 0
                  ? "Fecha límite vencida"
                  : daysLeft === 0
                  ? "Cierra hoy"
                  : `Cierra en ${daysLeft} día${daysLeft === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
        )}
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
                {proofById[c.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={proofById[c.id] as string}
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

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "muted" | "plain";
}) {
  const cls =
    tone === "income"
      ? "text-income"
      : tone === "muted"
      ? "text-amber-600 dark:text-amber-400"
      : "text-foreground";
  return (
    <div className="rounded-xl bg-muted/50 p-2.5 text-center">
      <p className={"tabular text-sm font-bold " + cls}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
