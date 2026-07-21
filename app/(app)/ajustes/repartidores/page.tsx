import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllProfiles, getSessionContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { RepartidoresManager } from "@/components/repartidores-manager";

export const dynamic = "force-dynamic";

export default async function RepartidoresPage() {
  const ctx = await getSessionContext();
  if (!ctx.isOperador) redirect("/ajustes");

  const profiles = await getAllProfiles();

  return (
    <div>
      <Link
        href="/ajustes"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Ajustes
      </Link>
      <PageHeader
        title="Repartidores"
        subtitle="Quién entrega en Cuba y qué puede ver cada uno"
      />
      <RepartidoresManager profiles={profiles} currentUserId={ctx.userId} />
    </div>
  );
}
