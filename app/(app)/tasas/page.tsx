import { getExchangeRates } from "@/lib/data";
import { RatesView } from "@/components/rates-view";
import { RateConverter } from "@/components/rate-converter";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TasasPage() {
  const rates = await getExchangeRates();
  return (
    <div>
      <PageHeader
        title="Tasas de cambio"
        subtitle="Se aplican por defecto en cada remesa"
      />
      <RateConverter rates={rates} />
      <h2 className="mb-2 text-sm font-bold text-foreground">Editar tasas</h2>
      <RatesView rates={rates} />
    </div>
  );
}
