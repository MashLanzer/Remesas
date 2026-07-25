import { Gift, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getActivePackages,
  getExchangeRates,
  getMyPoints,
  getMyBeneficiaries,
} from "@/lib/data";
import { PackagesView } from "@/components/packages-view";
import { EnviarRemesaCta } from "@/components/enviar-remesa-cta";

export const dynamic = "force-dynamic";

export default async function TiendaPage() {
  const supabase = await createClient();
  const [packages, rates, points, cfgRes, beneficiaries] = await Promise.all([
    getActivePackages(),
    getExchangeRates(),
    getMyPoints(),
    supabase.rpc("my_client_config"),
    getMyBeneficiaries(),
  ]);

  const cfg = (Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data) as
    | { point_value_usd?: number | null; redeem_min_points?: number | null }
    | null;
  const pointValue = Number(cfg?.point_value_usd ?? 0.05) || 0.05;
  const redeemMin = Number(cfg?.redeem_min_points ?? 100) || 100;

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

      {/* A tu medida: si ningún paquete encaja */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">
              ¿Ninguno encaja?
            </p>
            <p className="text-xs text-muted-foreground">
              Envía el monto que quieras, a quien tú elijas. Tú pones las reglas.
            </p>
          </div>
        </div>
        <EnviarRemesaCta
          rates={rates}
          pointsBalance={points.balance}
          redeemMin={redeemMin}
          pointValue={pointValue}
          beneficiaries={beneficiaries}
          variant="primary"
          label="Enviar a tu medida"
        />
      </div>
    </div>
  );
}
