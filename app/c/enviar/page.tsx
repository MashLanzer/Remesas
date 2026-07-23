import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRates, getMyPoints } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { OrderForm } from "@/components/order-form";

export const dynamic = "force-dynamic";

export default async function EnviarPage() {
  const supabase = await createClient();
  const [rates, points, cfgRes] = await Promise.all([
    getExchangeRates(),
    getMyPoints(),
    supabase.rpc("my_client_config"),
  ]);

  const cfg = (Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data) as
    | {
        point_value_usd?: number | null;
        redeem_min_points?: number | null;
      }
    | null;
  const pointValue = Number(cfg?.point_value_usd ?? 0.05) || 0.05;
  const redeemMin = Number(cfg?.redeem_min_points ?? 100) || 100;

  return (
    <div>
      <PageHeader
        title="Enviar remesa"
        subtitle="Tu familia en Cuba recibe en pocas horas"
      />
      <Card>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Send className="h-4 w-4" />
          </span>
          Nuevo envío
        </div>
        <OrderForm
          rates={rates}
          pointsBalance={points.balance}
          redeemMin={redeemMin}
          pointValue={pointValue}
        />
      </Card>
    </div>
  );
}
