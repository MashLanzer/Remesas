import {
  getRemittances,
  getSettlements,
  getBusinessSettings,
  getRepartidores,
  getSessionContext,
} from "@/lib/data";
import { calcPartnerBalance } from "@/lib/calc";
import { usd } from "@/lib/utils";
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
  const selectedRep = rep ? repartidores.find((r) => r.id === rep) : null;

  // El operador puede ver el combinado o filtrar por repartidor.
  const cuentasRem = rep
    ? remittances.filter((r) => r.deliverer_id === rep)
    : remittances;
  const cuentasSet = rep
    ? settlements.filter((s) => s.deliverer_id === rep)
    : settlements;

  // Lo que te deben los clientes (agrupado), para mostrarlo en Cuentas.
  const debtMap: Record<
    string,
    { name: string; phone: string | null; owed: number }
  > = {};
  for (const r of remittances) {
    if (r.client_paid !== false) continue;
    const key = r.client_id || r.client?.name || "?";
    const d = (debtMap[key] ??= {
      name: r.client?.name || "Cliente",
      phone: r.client?.phone ?? null,
      owed: 0,
    });
    d.owed += Number(r.total_received);
  }
  const clientDebts = Object.values(debtMap)
    .filter((d) => d.owed > 0)
    .sort((a, b) => b.owed - a.owed);

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
        delivererName={selectedRep?.full_name ?? null}
        delivererPhone={selectedRep?.phone ?? null}
        canSettle={isOperador ? !!rep : false}
        clientDebts={isOperador ? clientDebts : []}
      />
    </div>
  );

  // Resumen financiero (sobre las pestañas): pulso del negocio de un vistazo.
  const settledRems = remittances.filter((r) => r.status !== "pendiente");
  const myProfit = settledRems.reduce(
    (s, r) => s + Number(isOperador ? r.my_share : r.partner_share),
    0
  );
  const clientsOwe = isOperador
    ? remittances
        .filter((r) => r.client_paid === false)
        .reduce((s, r) => s + Number(r.total_received), 0)
    : 0;
  const cubaBalance = calcPartnerBalance(remittances, settlements);
  const balLabel = isOperador
    ? cubaBalance > 0.01
      ? "Por enviar"
      : cubaBalance < -0.01
      ? "A tu favor"
      : "Saldo Cuba"
    : cubaBalance > 0.01
    ? "Te deben"
    : cubaBalance < -0.01
    ? "Debes"
    : "Saldo";
  const balTone = isOperador
    ? cubaBalance > 0.01
      ? "destructive"
      : "foreground"
    : cubaBalance > 0.01
    ? "income"
    : "foreground";

  const kpis = [
    { label: "Tu ganancia", value: usd(myProfit), tone: "income" },
    ...(isOperador
      ? [
          {
            label: "Por cobrar",
            value: usd(clientsOwe),
            tone: clientsOwe > 0 ? "warning" : "foreground",
            target: "por-cobrar",
          },
        ]
      : []),
    {
      label: balLabel,
      value: usd(Math.abs(cubaBalance)),
      tone: balTone,
      target: "saldo-cuba",
    },
  ];

  return (
    <div>
      <PageHeader title="Finanzas" subtitle="Cuentas con Cuba y reportes" />
      <FinanzasTabs
        initial={initial}
        kpis={kpis}
        cuentas={cuentas}
        reportes={<ReportesView remittances={remittances} monthlyGoal={monthlyGoal} />}
      />
    </div>
  );
}
