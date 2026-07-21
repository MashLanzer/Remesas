import {
  getRemittances,
  getSettlements,
  getBusinessSettings,
  getRepartidores,
  getSessionContext,
} from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { CuentasView } from "@/components/cuentas-view";
import { ReportesView } from "@/components/reportes-view";
import { FinanzasTabs } from "@/components/finanzas-tabs";
import { RepartidorFilter } from "@/components/repartidor-filter";

export const dynamic = "force-dynamic";

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams?: { tab?: string; rep?: string };
}) {
  const [remittances, settlements, settings, ctx] = await Promise.all([
    getRemittances(),
    getSettlements(),
    getBusinessSettings(),
    getSessionContext(),
  ]);

  const monthlyGoal = settings.monthly_goal ? Number(settings.monthly_goal) : 0;
  const initial = searchParams?.tab === "reportes" ? "reportes" : "cuentas";
  const isOperador = ctx.isOperador;
  const rep = (isOperador && searchParams?.rep) || "";

  const repartidores = isOperador ? await getRepartidores() : [];

  // El operador puede ver el combinado o filtrar por repartidor.
  const cuentasRem = rep
    ? remittances.filter((r) => r.deliverer_id === rep)
    : remittances;
  const cuentasSet = rep
    ? settlements.filter((s) => s.deliverer_id === rep)
    : settlements;

  const cuentas = (
    <div>
      {isOperador && repartidores.length > 0 && (
        <RepartidorFilter repartidores={repartidores} value={rep} />
      )}
      {isOperador && !rep && repartidores.length > 0 && (
        <Card className="mb-4 border-info/30 bg-info/5">
          <p className="text-xs text-muted-foreground">
            Estás viendo el <b>combinado</b> de todos los repartidores. Elige uno
            arriba para ver su saldo y registrar pagos con esa persona.
          </p>
        </Card>
      )}
      <CuentasView
        remittances={cuentasRem}
        settlements={cuentasSet}
        settings={settings}
        perspective={isOperador ? "operador" : "repartidor"}
        delivererId={rep || null}
        canSettle={isOperador ? !!rep : false}
      />
    </div>
  );

  return (
    <div>
      <PageHeader title="Finanzas" subtitle="Cuentas con Cuba y reportes" />
      <FinanzasTabs
        initial={initial}
        cuentas={cuentas}
        reportes={<ReportesView remittances={remittances} monthlyGoal={monthlyGoal} />}
      />
    </div>
  );
}
