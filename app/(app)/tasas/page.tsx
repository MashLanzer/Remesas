import { getExchangeRates } from "@/lib/data";
import { RatesView } from "@/components/rates-view";
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
      <RatesView rates={rates} />
    </div>
  );
}
