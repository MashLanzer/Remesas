import { getRemittances, getSettlements, getBusinessSettings } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { CuentasView } from "@/components/cuentas-view";
import { ReportesView } from "@/components/reportes-view";
import { FinanzasTabs } from "@/components/finanzas-tabs";

export const dynamic = "force-dynamic";

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const [remittances, settlements, settings] = await Promise.all([
    getRemittances(),
    getSettlements(),
    getBusinessSettings(),
  ]);

  const monthlyGoal = settings.monthly_goal ? Number(settings.monthly_goal) : 0;
  const initial = searchParams?.tab === "reportes" ? "reportes" : "cuentas";

  return (
    <div>
      <PageHeader title="Finanzas" subtitle="Cuentas con Cuba y reportes" />
      <FinanzasTabs
        initial={initial}
        cuentas={
          <CuentasView
            remittances={remittances}
            settlements={settlements}
            settings={settings}
          />
        }
        reportes={<ReportesView remittances={remittances} monthlyGoal={monthlyGoal} />}
      />
    </div>
  );
}
