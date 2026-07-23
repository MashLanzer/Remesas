import Link from "next/link";
import { Sparkles, Package, Star, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveOffers,
  getActivePackages,
  getExchangeRates,
  getMyOrders,
  getMyPoints,
} from "@/lib/data";
import { Card, EmptyState } from "@/components/ui";
import { localAmount, packageReceives } from "@/lib/utils";
import { RateConverter } from "@/components/rate-converter";
import { EnviarRemesaCta } from "@/components/enviar-remesa-cta";
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

  const [offers, packages, rates, orders, points, cfgRes, profileRes] =
    await Promise.all([
      getActiveOffers(),
      getActivePackages(),
      getExchangeRates(),
      getMyOrders(),
      getMyPoints(),
      supabase.rpc("my_client_config"),
      user
        ? supabase.from("profiles").select("full_name").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
    ]);
  const recentOrders = orders.slice(0, 2);
  const featuredOffers = offers.slice(0, 3);
  const featuredPackages = packages.slice(0, 3);

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
      {/* Saludo + puntos de un vistazo */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {firstName ? (
              <>
                Hola,{" "}
                <span className="font-semibold text-foreground">{firstName}</span>{" "}
                👋
              </>
            ) : (
              "Bienvenido 👋"
            )}
          </p>
          <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-foreground">
            {brand}
          </h1>
        </div>
        <Link
          href="/c/puntos"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-bold text-primary transition active:scale-95"
        >
          <Star className="h-4 w-4" /> {points.balance}
        </Link>
      </div>

      {/* CTA principal: enviar remesa (abre en sheet) */}
      <EnviarRemesaCta
        rates={rates}
        pointsBalance={points.balance}
        redeemMin={redeemMin}
        pointValue={pointValue}
      />

      {/* Paquetes de remesa destacados */}
      {featuredPackages.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Gift className="h-4 w-4 text-primary" /> Paquetes de remesa
            </h2>
            <Link href="/c/tienda" className="text-xs font-semibold text-primary">
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {featuredPackages.map((p) => {
              const receives = packageReceives(
                p.amount_usd,
                p.delivery_currency,
                rates
              );
              return (
                <Link key={p.id} href="/c/tienda" className="block">
                  <Card className="flex items-center gap-3 p-3.5 transition active:scale-[0.99]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                      {p.emoji || "🎁"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-foreground">
                          {p.title}
                        </p>
                        {p.highlight && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {p.highlight}
                          </span>
                        )}
                      </div>
                      {receives != null && p.delivery_currency !== "USD" && (
                        <p className="truncate text-xs font-semibold text-income">
                          Recibe ~{localAmount(receives)} {p.delivery_currency}
                        </p>
                      )}
                    </div>
                    <span className="tabular shrink-0 text-sm font-bold text-foreground">
                      ${Number(p.amount_usd)}
                      {p.delivery_currency ? (
                        <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                          {p.delivery_currency}
                        </span>
                      ) : null}
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Tasa del día */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-foreground">
          Tasa del día · ¿cuánto recibe tu familia?
        </h2>
        <RateConverter rates={rates} />
      </section>

      {/* Ofertas destacadas */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Ofertas
          </h2>
        </div>
        {featuredOffers.length === 0 ? (
          <EmptyState
            title="Sin ofertas por ahora"
            description="Cuando haya promociones o tasas especiales, aparecerán aquí."
          />
        ) : (
          <div className="space-y-3">
            {featuredOffers.map((o) => {
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

      {/* Mis pedidos recientes (vistazo) */}
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
    </div>
  );
}
