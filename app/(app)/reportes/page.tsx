import { getRemittances } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/ui";
import { ReportesView } from "@/components/reportes-view";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const all = await getRemittances();

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
      <ReportesView remittances={all} />
    </div>
  );
}
