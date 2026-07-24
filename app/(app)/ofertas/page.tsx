import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOffers, getBusinessSettings, getSessionContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { OffersManager } from "@/components/offers-manager";

export const dynamic = "force-dynamic";

export default async function OfertasPage() {
  const ctx = await getSessionContext();
  if (!ctx.isOperador) redirect("/ajustes");
  const [offers, settings] = await Promise.all([
    getOffers(),
    getBusinessSettings(),
  ]);
  const brand = settings.business_name || "Giro";

  return (
    <div>
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>
      <PageHeader
        title="Promociones"
        subtitle="Lo que ven tus clientes en su app"
      />
      <OffersManager offers={offers} brand={brand} />
    </div>
  );
}
