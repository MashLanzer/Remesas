import Link from "next/link";
import {
  Send,
  Clock,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  Wallet,
} from "lucide-react";
import {
  getRemittances,
  getSettlements,
  getBusinessSettings,
} from "@/lib/data";
import { calcPartnerBalance } from "@/lib/calc";
import { usd, formatDate } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00").getTime();
  return Math.floor((Date.now() - d) / 86400000);
}

export default async function NotificacionesPage() {
  const [all, settlements, settings] = await Promise.all([
    getRemittances(),
    getSettlements(),
    getBusinessSettings(),
  ]);

  const pendientes = all
    .filter((r) => r.status === "pendiente")
    .sort((a, b) => a.date.localeCompare(b.date)); // más antiguas primero
  const porCobrar = all.filter((r) => r.client_paid === false);

  const balance = calcPartnerBalance(all, settlements);
  const threshold = settings.settle_threshold ? Number(settings.settle_threshold) : 0;
  const saldoAlto = threshold > 0 && balance >= threshold;

  const nada = pendientes.length === 0 && porCobrar.length === 0 && !saldoAlto;

  return (
    <div>
      <PageHeader title="Notificaciones" subtitle="Lo que necesita tu atención" />

      {nada ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-income/10 text-income">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <p className="text-base font-semibold text-foreground">
            ¡Todo al día! 🎉
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            No hay remesas pendientes ni cobros por hacer.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {saldoAlto && (
            <Link href="/socios">
              <Card className="flex items-center justify-between border-warning/30 bg-warning/10 transition active:scale-[0.99]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-warning">
                      Saldo pendiente alto
                    </p>
                    <p className="text-xs text-warning/80">
                      {usd(balance)} · pasó tu límite de {usd(threshold)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-warning" />
              </Card>
            </Link>
          )}

          {pendientes.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                <Clock className="h-4 w-4 text-warning" /> Pendientes de entregar
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">
                  {pendientes.length}
                </span>
              </h2>
              <div className="space-y-2">
                {pendientes.map((r) => {
                  const d = daysAgo(r.date);
                  const urgent = d >= 3;
                  return (
                    <Link key={r.id} href={`/remesas/${r.id}`}>
                      <Card className="flex items-center justify-between p-3.5 transition active:scale-[0.99]">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                            <Send className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {r.beneficiary?.name || r.client?.name || "Remesa"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {usd(r.amount_usd)} ·{" "}
                              <span className={urgent ? "font-semibold text-destructive" : ""}>
                                {d === 0
                                  ? "hoy"
                                  : d === 1
                                  ? "hace 1 día"
                                  : `hace ${d} días`}
                              </span>
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {porCobrar.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                <DollarSign className="h-4 w-4 text-info" /> Por cobrar al cliente
                <span className="rounded-full bg-info/10 px-2 py-0.5 text-xs text-info">
                  {porCobrar.length}
                </span>
              </h2>
              <div className="space-y-2">
                {porCobrar.map((r) => (
                  <Link key={r.id} href={`/remesas/${r.id}`}>
                    <Card className="flex items-center justify-between p-3.5 transition active:scale-[0.99]">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                          <DollarSign className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {r.client?.name || r.beneficiary?.name || "Remesa"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Debe {usd(r.total_received)} · {formatDate(r.date)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
