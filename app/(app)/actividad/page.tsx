import { Activity } from "lucide-react";
import { getActivityLog, getSessionContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { ActivityList } from "@/components/activity-list";

export const dynamic = "force-dynamic";

export default async function ActividadPage() {
  const [entries, ctx] = await Promise.all([
    getActivityLog(150),
    getSessionContext(),
  ]);

  return (
    <div>
      <PageHeader
        title="Actividad"
        subtitle={
          ctx.isOperador ? "Todo lo que hace tu equipo" : "Tu historial"
        }
        icon={Activity}
      />
      <ActivityList entries={entries} isOperador={ctx.isOperador} />
    </div>
  );
}
