import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getBusinessSettings,
  getExchangeRates,
  getPackages,
  getSessionContext,
} from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { PackagesManager } from "@/components/packages-manager";

export const dynamic = "force-dynamic";

export default async function PaquetesPage() {
  const ctx = await getSessionContext();
  if (!ctx.isOperador) redirect("/ajustes");
  const [packages, rates, settings] = await Promise.all([
    getPackages(),
    getExchangeRates(),
    getBusinessSettings(),
  ]);
  const rules = {
    commission_threshold: settings.commission_threshold,
    commission_percent: settings.commission_percent,
    commission_flat: settings.commission_flat,
  };

  return (
    <div>
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>
      <PageHeader
        title="Paquetes de remesa"
        subtitle="Ofertas de envío listas para que el cliente pida con un toque"
      />
      <PackagesManager packages={packages} rates={rates} rules={rules} />
    </div>
  );
}
