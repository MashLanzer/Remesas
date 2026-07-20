import { getRemittances, getBusinessSettings } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/ui";
import { ReportesView } from "@/components/reportes-view";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const [all, settings] = await Promise.all([
    getRemittances(),
    getBusinessSettings(),
  ]);
  const monthlyGoal = settings.monthly_goal ? Number(settings.monthly_goal) : 0;

  if (all.length === 0) {
    return (
      <div>
        <PageHeader title="Reportes" />
        <EmptyState
          title="Aún no hay datos"
          description="Los reportes se llenan a medida que registras remesas."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Reportes" subtitle="Ganancias y envíos por período" />
      <ReportesView remittances={all} monthlyGoal={monthlyGoal} />
    </div>
  );
}
