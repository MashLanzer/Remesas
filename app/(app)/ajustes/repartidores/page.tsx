import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionContext, getTeam } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { TeamManager } from "@/components/repartidores-manager";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const ctx = await getSessionContext();
  if (!ctx.isOperador) redirect("/ajustes");

  const team = await getTeam();

  return (
    <div>
      <Link
        href="/ajustes"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Ajustes
      </Link>
      <PageHeader
        title="Mi equipo"
        subtitle="Tu código, solicitudes y repartidores"
      />
      <TeamManager code={team.code} pending={team.pending} members={team.members} />
    </div>
  );
}
