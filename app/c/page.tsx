import Link from "next/link";
import { Package, Star, Gift, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveOffers,
  getActivePackages,
  getExchangeRates,
  getRateHistory,
  getMyOrders,
  getMyPoints,
  getMyBeneficiaries,
} from "@/lib/data";
import { Card } from "@/components/ui";
import { localAmount, packageReceives, usd } from "@/lib/utils";
import { EnviarRemesaCta } from "@/components/enviar-remesa-cta";
import { CalculadoraSheet } from "@/components/calculadora-sheet";
import { OffersView } from "@/components/offers-view";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PaperPlane } from "@/components/paper-plane";
import { ClienteGreeting } from "@/components/cliente-greeting";
import { QuickSendRow } from "@/components/quick-send-row";
import { Send, Check, PartyPopper } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClienteHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    offers,
    packages,
    rates,
    orders,
    points,
    cfgRes,
    profileRes,
    beneficiaries,
    rateHistory,
  ] = await Promise.all([
    getActiveOffers(),
    getActivePackages(),
    getExchangeRates(),
    getMyOrders(),
    getMyPoints(),
    supabase.rpc("my_client_config"),
    user
      ? supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    getMyBeneficiaries(),
    getRateHistory(),
  ]);
  const recentOrders = orders.slice(0, 3);
  const featuredOffers = [...offers]
    .sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false))
    .slice(0, 6);
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

  // Tasas activas para el hero (hasta 3).
  const heroRates = rates
    .filter((r) => r.active !== false && Number(r.rate) > 0)
    .slice(0, 3);

  // Tendencia por moneda: compara las dos últimas entradas del historial.
  const rateTrend: Record<string, "up" | "down" | null> = {};
  for (const c of Array.from(new Set(rateHistory.map((h) => h.currency)))) {
    const hs = rateHistory
      .filter((h) => h.currency === c)
      .sort((a, b) => a.changed_at.localeCompare(b.changed_at));
    if (hs.length >= 2) {
      const prev = Number(hs[hs.length - 2].rate);
      const cur = Number(hs[hs.length - 1].rate);
      rateTrend[c] = cur > prev ? "up" : cur < prev ? "down" : null;
    }
  }

  const sendProps = {
    rates,
    pointsBalance: points.balance,
    redeemMin,
    pointValue,
    beneficiaries,
  };

  // Aviso: pedido aceptado o entregado en las últimas 48 h.
  const now = Date.now();
  const recentEvent = orders.find((o) => {
    const ts = o.delivered_at || o.accepted_at;
    return ts && now - new Date(ts).getTime() < 48 * 3600000;
  });
  const recentDelivered =
    recentEvent && recentEvent.delivered_at
      ? now - new Date(recentEvent.delivered_at).getTime() < 48 * 3600000
      : false;

  return (
    <div className="space-y-6">
      {/* Hero: saludo + puntos + tasa del día + enviar + calculadora */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 p-5 text-white shadow-xl shadow-primary/20">
        <div
          className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-black/10 blur-2xl"
          aria-hidden
        />
        <PaperPlane
          className="pointer-events-none absolute -right-4 bottom-2 h-28 w-28 rotate-12 text-white/10"
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <ClienteGreeting firstName={firstName} />
            <Link
              href="/c/puntos"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white backdrop-blur transition active:scale-95"
            >
              <Star className="h-4 w-4" /> {points.balance}
            </Link>
          </div>

          <h1 className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight">
            Envía dinero
            <br />a Cuba
          </h1>
          {heroRates.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {heroRates.map((r) => {
                const t = rateTrend[r.currency];
                return (
                  <span
                    key={r.currency}
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur"
                  >
                    1 USD = {localAmount(Number(r.rate))} {r.currency}
                    {t === "up" && <span className="text-emerald-200">▲</span>}
                    {t === "down" && <span className="text-rose-200">▼</span>}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="mt-1 text-sm text-white/85">
              Rápido, seguro y con seguimiento en vivo.
            </p>
          )}

          <div className="mt-4">
            <EnviarRemesaCta
              rates={rates}
              pointsBalance={points.balance}
              redeemMin={redeemMin}
              pointValue={pointValue}
              beneficiaries={beneficiaries}
            />
          </div>
        </div>
      </div>

      {/* Calculadora (fuera del hero, más discreta) */}
      <CalculadoraSheet rates={rates} variant="plain" />

      {/* Enviar rápido a tus beneficiarios */}
      <QuickSendRow {...sendProps} />

      {/* Aviso de novedad en un pedido */}
      {recentEvent && (
        <Link href={`/c/pedidos/${recentEvent.id}`} className="block">
          <div className="flex items-center gap-2 rounded-2xl border border-income/30 bg-income/10 px-4 py-3 text-sm font-semibold text-income transition active:scale-[0.99]">
            {recentDelivered ? "🎉" : "✅"}{" "}
            {recentDelivered
              ? `Tu envío para ${recentEvent.beneficiary_name || "tu familia"} fue entregado`
              : `Tu pedido para ${recentEvent.beneficiary_name || "tu familia"} fue aceptado`}
            <ChevronRight className="ml-auto h-4 w-4 shrink-0" />
          </div>
        </Link>
      )}

      {/* Paquetes de remesa destacados (scroll horizontal) */}
      {featuredPackages.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <span className="h-4 w-1 rounded-full bg-primary" />
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
            <span className="h-4 w-1 rounded-full bg-primary" />
            <Star className="h-4 w-4 text-primary" /> Anuncios
          </h2>
          <OffersView offers={featuredOffers} sendProps={sendProps} />
        </section>
      )}

      {/* Mis pedidos recientes (solo si hay) */}
      {recentOrders.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <span className="h-4 w-1 rounded-full bg-primary" />
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
            {recentOrders.map((o) => {
              const oRate = Number(
                rates.find((r) => r.currency === o.delivery_currency)?.rate ?? 0
              );
              const oReceives = Number(o.amount_usd) * oRate;
              return (
                <Link key={o.id} href={`/c/pedidos/${o.id}`} className="block">
                  <Card className="flex items-center justify-between gap-3 p-3.5 transition active:scale-[0.99]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {o.beneficiary_name || "Beneficiario"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {usd(Number(o.amount_usd))}
                        {oRate > 0
                          ? ` · recibe ≈ ${localAmount(oReceives)} ${o.delivery_currency}`
                          : o.delivery_currency
                          ? ` · ${o.delivery_currency}`
                          : ""}
                      </p>
                    </div>
                    <OrderStatusBadge order={o} />
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Primeros pasos (cliente nuevo, sin pedidos) */}
      {recentOrders.length === 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-foreground">
            <span className="h-4 w-1 rounded-full bg-primary" />
            Cómo funciona
          </h2>
          <div className="space-y-3">
            <HowStep
              n={1}
              icon={<Send className="h-5 w-5" />}
              title="Pide tu remesa"
              desc="Elige el monto y quién recibe en Cuba."
            />
            <HowStep
              n={2}
              icon={<Check className="h-5 w-5" />}
              title="El negocio la acepta"
              desc="Confirma el envío y empieza el reparto."
            />
            <HowStep
              n={3}
              icon={<PartyPopper className="h-5 w-5" />}
              title="Entrega con seguimiento"
              desc="Sigues cada paso hasta tu familia."
            />
          </div>
        </section>
      )}

    </div>
  );
}

function HowStep({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {n}
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
