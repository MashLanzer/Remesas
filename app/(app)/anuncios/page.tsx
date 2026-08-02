import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAnnouncements, getSessionContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { AnnouncementsManager } from "@/components/announcements-manager";

export const dynamic = "force-dynamic";

export default async function AnunciosPage() {
  const ctx = await getSessionContext();
  if (!ctx.isOperador) redirect("/");

  const announcements = await getAnnouncements();

  return (
    <div>
      <Link
        href="/gestion"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Gestión
      </Link>
      <PageHeader
        title="Anuncios a clientes"
        subtitle="Avisos que ven tus clientes y repartidores en su inicio"
      />
      <AnnouncementsManager items={announcements} />
    </div>
  );
}
