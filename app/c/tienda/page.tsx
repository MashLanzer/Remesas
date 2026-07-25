import { Gift } from "lucide-react";
import { getActivePackages, getExchangeRates } from "@/lib/data";
import { PackagesView } from "@/components/packages-view";

export const dynamic = "force-dynamic";

export default async function TiendaPage() {
  const [packages, rates] = await Promise.all([
    getActivePackages(),
    getExchangeRates(),
  ]);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Gift className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Paquetes para tu familia
          </h1>
          <p className="text-sm text-muted-foreground">
            Elige uno y llega a Cuba en un toque · a la tasa de hoy
          </p>
        </div>
      </div>
      <PackagesView packages={packages} rates={rates} />
    </div>
  );
}
