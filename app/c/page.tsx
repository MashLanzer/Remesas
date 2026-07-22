import Link from "next/link";
import { Sparkles, Package, Star, ChevronRight, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveOffers,
  getExchangeRates,
  getMyOrders,
  getMyPoints,
} from "@/lib/data";
import { Card, EmptyState } from "@/components/ui";
import { RateConverter } from "@/components/rate-converter";
import { ClientOrderButton } from "@/components/client-order-button";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { OFFER_KINDS, type Offer } from "@/lib/types";

export const dynamic = "force-dynamic";

function kindMeta(o: Offer) {
  const k = OFFER_KINDS.find((x) => x.key === o.kind);
  return { emoji: o.emoji || k?.emoji || "📣", label: k?.label ?? "Anuncio" };
}

function validity(o: Offer): string | null {
  if (o.ends_at) return `Válido hasta ${fmt(o.ends_at)}`;
  if (o.starts_at) return `Desde ${fmt(o.starts_at)}`;
  return null;
}
function fmt(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

export default async function ClienteHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [offers, rates, orders, points, cfgRes, profileRes] =
    await Promise.all([
      getActiveOffers(),
      getExchangeRates(),
      getMyOrders(),
      getMyPoints(),
      supabase.rpc("my_client_config"),
      user
        ? supabase.from("profiles").select("full_name").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
    ]);
  const recentOrders = orders.slice(0, 3);

  const cfg = (Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data) as
    | {
        business_name?: string | null;
        point_value_usd?: number | null;
        redeem_min_points?: number | null;
      }
    | null;

  const firstName =
    (profileRes.data?.full_name as string | undefined)?.trim().split(" ")[0] ??
    null;
  const brand = cfg?.business_name || "Giro";
  const pointValue = Number(cfg?.point_value_usd ?? 0.05) || 0.05;
  const redeemMin = Number(cfg?.redeem_min_points ?? 100) || 100;

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <p className="text-sm text-muted-foreground">
          {firstName ? (
            <>
              Hola, <span className="font-semibold text-foreground">{firstName}</span> 👋
            </>
          ) : (
            "Bienvenido 👋"
          )}
        </p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
          {brand}
        </h1>
      </div>

      {/* Puntos */}
      {points.balance > 0 && (
        <Link href="/c/puntos" className="block">
          <Card className="flex items-center justify-between border-primary/30 bg-primary/5 transition active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Star className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {points.balance} puntos
                </p>
                <p className="text-xs text-muted-foreground">
                  Ganas puntos con cada envío
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Card>
        </Link>
      )}

      {/* Pedir remesa */}
      <ClientOrderButton
        rates={rates}
        pointsBalance={points.balance}
        redeemMin={redeemMin}
        pointValue={pointValue}
      />

      {/* Tienda */}
      <Link href="/c/tienda" className="block">
        <Card className="flex items-center justify-between transition active:scale-[0.99]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Tienda</p>
              <p className="text-xs text-muted-foreground">
                Combos, recargas y más para Cuba
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Card>
      </Link>

      {/* Mis pedidos recientes */}
      {recentOrders.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Package className="h-4 w-4 text-primary" /> Mis pedidos
            </h2>
            <Link href="/c/pedidos" className="text-xs font-semibold text-primary">
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.map((o) => (
              <Card key={o.id} className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {o.beneficiary_name || "Beneficiario"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${Number(o.amount_usd)} · {o.delivery_currency || ""}
                  </p>
                </div>
                <OrderStatusBadge order={o} />
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Calculadora de tasas */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-foreground">
          ¿Cuánto recibe tu familia?
        </h2>
        <RateConverter rates={rates} />
      </section>

      {/* Ofertas */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> Ofertas
        </h2>
        {offers.length === 0 ? (
          <EmptyState
            title="Sin ofertas por ahora"
            description="Cuando haya promociones o tasas especiales, aparecerán aquí."
          />
        ) : (
          <div className="space-y-3">
            {offers.map((o) => {
              const m = kindMeta(o);
              const v = validity(o);
              return (
                <Card key={o.id} className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                    {m.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">
                        {o.title}
                      </p>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {m.label}
                      </span>
                    </div>
                    {o.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {o.description}
                      </p>
                    )}
                    {v && (
                      <p className="mt-1 text-[11px] font-medium text-primary">
                        {v}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
