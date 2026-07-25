import {
  getExchangeRates,
  getRateHistory,
  getBusinessSettings,
} from "@/lib/data";
import { RefreshCw } from "lucide-react";
import { RatesView } from "@/components/rates-view";
import { RateConverter } from "@/components/rate-converter";
import { ShareRates } from "@/components/share-rates";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TasasPage() {
  const [rates, history, settings] = await Promise.all([
    getExchangeRates(),
    getRateHistory(),
    getBusinessSettings(),
  ]);
  const brand = settings.business_name || "Giro";
  const date = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div>
      <PageHeader
        title="Tasas de cambio"
        subtitle="Se aplican por defecto en cada remesa"
        icon={RefreshCw}
      />
      <RateConverter rates={rates} />
      <ShareRates brand={brand} date={date} rates={rates} />
      <h2 className="mb-2 text-sm font-bold text-foreground">Editar tasas</h2>
      <RatesView rates={rates} history={history} />
    </div>
  );
}
