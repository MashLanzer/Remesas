import Link from "next/link";
import { Package, Star, Gift, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveOffers,
  getActivePackages,
  getExchangeRates,
  getMyOrders,
  getMyPoints,
} from "@/lib/data";
import { Card } from "@/components/ui";
import { localAmount, packageReceives } from "@/lib/utils";
import { EnviarRemesaCta } from "@/components/enviar-remesa-cta";
import { CalculadoraSheet } from "@/components/calculadora-sheet";
import { OffersView } from "@/components/offers-view";
import { OrderStatusBadge } from "@/components/order-status-badge";

export const dynamic = "force-dynamic";

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
  const recentOrders = orders.slice(0, 3);
  const featuredOffers = offers.slice(0, 6);
  const featuredPackages = packages.slice(0, 6);

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
  const pointValue = Number(cfg?.point_value_usd ?? 0.05) || 0.05;
  const redeemMin = Number(cfg?.redeem_min_points ?? 100) || 100;

  // Tasa destacada para el hero: CUP si existe; si no, la primera activa que no
  // sea USD.
  const primaryRate =
    rates.find((r) => r.currency === "CUP" && r.active !== false) ??
    rates.find((r) => r.active !== false && r.currency !== "USD") ??
    null;

  return (
    <div className="space-y-6">
      {/* Hero: saludo + puntos + tasa del día + enviar + calculadora */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 p-5 text-white shadow-xl shadow-primary/20">
        <div
          className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-white/85">
              {firstName ? (
                <>
                  Hola,{" "}
                  <span className="font-bold text-white">{firstName}</span> 👋
                </>
              ) : (
                "Bienvenido 👋"
              )}
            </p>
            <Link
              href="/c/puntos"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white backdrop-blur transition active:scale-95"
            >
              <Star className="h-4 w-4" /> {points.balance}
            </Link>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight">
            Envía dinero a Cuba
          </h1>
          {primaryRate ? (
            <p className="mt-1 text-sm text-white/85">
              Tasa de hoy · 1 USD ={" "}
              <span className="font-bold text-white">
                {localAmount(Number(primaryRate.rate))} {primaryRate.currency}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-white/85">
              Rápido, seguro y con seguimiento en vivo.
            </p>
          )}

          <div className="mt-4 space-y-2">
            <EnviarRemesaCta
              rates={rates}
              pointsBalance={points.balance}
              redeemMin={redeemMin}
              pointValue={pointValue}
            />
            <CalculadoraSheet rates={rates} />
          </div>
        </div>
      </div>

      {/* Paquetes de remesa destacados (scroll horizontal) */}
      {featuredPackages.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Gift className="h-4 w-4 text-primary" /> Paquetes de remesa
            </h2>
            <Link
              href="/c/tienda"
              className="flex items-center text-xs font-semibold text-primary"
            >
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {featuredPackages.map((p) => {
              const receives = packageReceives(
                p.amount_usd,
                p.delivery_currency,
                rates
              );
              return (
                <Link key={p.id} href="/c/tienda" className="w-40 shrink-0">
                  <Card className="flex h-full flex-col gap-2 p-4 transition active:scale-[0.98]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                      {p.emoji || "🎁"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {p.title}
                      </p>
                      {receives != null && p.delivery_currency !== "USD" ? (
                        <p className="truncate text-xs font-semibold text-income">
                          Recibe ~{localAmount(receives)} {p.delivery_currency}
                        </p>
                      ) : (
                        <p className="truncate text-xs text-muted-foreground">
                          Entrega en {p.delivery_currency || "—"}
                        </p>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                      <span className="tabular text-sm font-bold text-foreground">
                        ${Number(p.amount_usd)}
                      </span>
                      {p.highlight ? (
                        <span className="truncate rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                          {p.highlight}
                        </span>
                      ) : null}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Anuncios / ofertas (solo si hay) */}
      {featuredOffers.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Star className="h-4 w-4 text-primary" /> Anuncios
          </h2>
          <OffersView offers={featuredOffers} />
        </section>
      )}

      {/* Mis pedidos recientes (solo si hay) */}
      {recentOrders.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Package className="h-4 w-4 text-primary" /> Mis pedidos
            </h2>
            <Link
              href="/c/pedidos"
              className="flex items-center text-xs font-semibold text-primary"
            >
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.map((o) => (
              <Link key={o.id} href="/c/pedidos" className="block">
                <Card className="flex items-center justify-between p-3.5 transition active:scale-[0.99]">
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
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
