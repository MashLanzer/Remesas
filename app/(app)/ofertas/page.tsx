import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOffers, getSessionContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { OffersManager } from "@/components/offers-manager";

export const dynamic = "force-dynamic";

export default async function OfertasPage() {
  const ctx = await getSessionContext();
  if (!ctx.isOperador) redirect("/ajustes");
  const offers = await getOffers();

  return (
    <div>
      <Link
        href="/ajustes"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Ajustes
      </Link>
      <PageHeader
        title="Promociones"
        subtitle="Lo que ven tus clientes en su app"
      />
      <OffersManager offers={offers} />
    </div>
  );
}
