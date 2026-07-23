import { getActivePackages, getExchangeRates } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { PackagesView } from "@/components/packages-view";

export const dynamic = "force-dynamic";

export default async function TiendaPage() {
  const [packages, rates] = await Promise.all([
    getActivePackages(),
    getExchangeRates(),
  ]);

  return (
    <div>
      <PageHeader
        title="Paquetes de remesa"
        subtitle="Envíos listos para tu familia · a la tasa de hoy"
      />
      <PackagesView packages={packages} rates={rates} />
    </div>
  );
}
