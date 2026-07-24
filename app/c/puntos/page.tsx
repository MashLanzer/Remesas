import { Star, Gift, Send, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyPoints } from "@/lib/data";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { IlluPoints } from "@/components/illustrations";
import { usd } from "@/lib/utils";

export const dynamic = "force-dynamic";

function reasonMeta(reason: string | null) {
  switch (reason) {
    case "remesa":
      return { label: "Envío entregado", icon: Send };
    case "canje":
      return { label: "Canje", icon: Gift };
    default:
      return { label: "Ajuste", icon: Settings2 };
  }
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PuntosPage() {
  const supabase = await createClient();
  const [{ balance, entries }, cfgRes] = await Promise.all([
    getMyPoints(),
    supabase.rpc("my_client_config"),
  ]);
  const cfg = (Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data) as
    | { point_value_usd?: number | null; redeem_min_points?: number | null }
    | null;
  const pointValue = Number(cfg?.point_value_usd ?? 0.05) || 0.05;
  const redeemMin = Number(cfg?.redeem_min_points ?? 100) || 100;
  const worth = balance * pointValue;
  const canRedeem = balance >= redeemMin;
  const missing = Math.max(redeemMin - balance, 0);

  return (
    <div>
      <PageHeader title="Mis puntos" />

      {/* Saldo */}
      <div className="mb-4 rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 p-5 text-white shadow-xl">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white/75">
          <Star className="h-4 w-4" /> Tienes
        </p>
        <p className="tabular mt-1 text-4xl font-extrabold">{balance} puntos</p>
        <p className="mt-1 text-xs text-white/70">
          ≈ {usd(worth)} en descuentos · ganas puntos con cada remesa entregada.
        </p>
      </div>

      {/* Cómo canjear */}
      <Card className="mb-5 space-y-2 border-primary/20 bg-primary/5">
        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Gift className="h-4 w-4 text-primary" /> Cómo usar tus puntos
        </p>
        <p className="text-xs text-muted-foreground">
          Cada punto vale ≈ {usd(pointValue)}. Desde {redeemMin} puntos puedes
          canjearlos por un descuento en la comisión de tu próxima remesa.
        </p>
        {/* Progreso hacia el mínimo de canje */}
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{Math.min(balance, redeemMin)} / {redeemMin} pts</span>
            <span>{canRedeem ? "¡Listo!" : `faltan ${missing}`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={
                "h-full rounded-full transition-all " +
                (canRedeem ? "bg-income" : "bg-primary")
              }
              style={{
                width: `${Math.min((balance / redeemMin) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
        {canRedeem ? (
          <p className="rounded-lg bg-income/10 px-2.5 py-1.5 text-xs font-semibold text-income">
            ¡Puedes canjear! Marca “Usar mis puntos” al enviar tu próxima remesa.
          </p>
        ) : (
          <p className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            Sigue enviando para llegar a {redeemMin} puntos y canjear.
          </p>
        )}
      </Card>

      <h2 className="mb-2 text-sm font-bold text-foreground">Historial</h2>
      {entries.length === 0 ? (
        <EmptyState
          illustration={<IlluPoints />}
          title="Sin movimientos"
          description="Cuando se entregue tu primera remesa, ganarás puntos aquí."
        />
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const m = reasonMeta(e.reason);
            const Icon = m.icon;
            const positive = e.delta >= 0;
            return (
              <Card key={e.id} className="flex items-center gap-3 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {when(e.created_at)}
                  </p>
                </div>
                <span
                  className={
                    "tabular text-sm font-bold " +
                    (positive ? "text-income" : "text-destructive")
                  }
                >
                  {positive ? "+" : ""}
                  {e.delta}
                </span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
