import { createClient } from "@/lib/supabase/server";
import {
  getMyOrders,
  getExchangeRates,
  getMyPoints,
  getMyBeneficiaries,
  getBusinessSettings,
  getMyOperatorContact,
} from "@/lib/data";
import { OrderEta } from "@/components/order-eta";
import { OrderContactButton } from "@/components/order-contact-button";
import { PointsProgress } from "@/components/points-progress";
import { methodTag, pointsForOrder } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import {
  OrderStatusBadge,
  orderDisplay,
} from "@/components/order-status-badge";
import { OrderTimeline } from "@/components/order-timeline";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { ShareTrackButton } from "@/components/share-track-button";
import { EnviarRemesaCta } from "@/components/enviar-remesa-cta";
import { ActiveOrderCard } from "@/components/active-order-card";
import { ClientOrderHistory } from "@/components/client-order-history";
import { IlluOrders } from "@/components/illustrations";
import { usd } from "@/lib/utils";
import Link from "next/link";
import {
  Truck,
  CheckCircle2,
  Send,
  Check,
  PartyPopper,
  Star,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MisPedidosPage() {
  const supabase = await createClient();
  const [orders, rates, points, cfgRes, beneficiaries, settings, contact] =
    await Promise.all([
      getMyOrders(),
      getExchangeRates(),
      getMyPoints(),
      supabase.rpc("my_client_config"),
      getMyBeneficiaries(),
      getBusinessSettings(),
      getMyOperatorContact(),
    ]);
  const perUsd = Number(settings.points_per_usd ?? 0.2) || 0.2;

  const cfg = (Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data) as
    | { point_value_usd?: number | null; redeem_min_points?: number | null }
    | null;
  const pointValue = Number(cfg?.point_value_usd ?? 0.05) || 0.05;
  const redeemMin = Number(cfg?.redeem_min_points ?? 100) || 100;

  // ---- Estado vacío: pantalla útil, no un cartel solo ----
  if (orders.length === 0) {
    return (
      <div>
        <PageHeader title="Mis pedidos" icon={Send} />
        <div className="flex flex-col items-center pt-4 text-center">
          <IlluOrders />
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Aún no has enviado
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Tu primer envío aparecerá aquí con seguimiento en vivo, paso a paso
            hasta tu familia.
          </p>
          <div className="mt-5 w-full">
            <EnviarRemesaCta
              rates={rates}
              pointsBalance={points.balance}
              redeemMin={redeemMin}
              pointValue={pointValue}
              variant="primary"
            />
          </div>
        </div>

        <div className="mt-8">
          <h3 className="mb-3 text-sm font-bold text-foreground">
            Cómo funciona
          </h3>
          <div className="space-y-3">
            <HowStep
              n={1}
              icon={Send}
              title="Pides tu remesa"
              desc="Eliges el monto y quién recibe en Cuba."
            />
            <HowStep
              n={2}
              icon={Check}
              title="El negocio la acepta"
              desc="Confirma el envío y empieza el reparto."
            />
            <HowStep
              n={3}
              icon={PartyPopper}
              title="Entrega con seguimiento"
              desc="Sigues cada paso hasta que llega a tu familia."
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <Star className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            Ganas <span className="font-semibold">puntos con cada envío</span>{" "}
            para descuentos en tus próximas remesas.
          </p>
        </div>
      </div>
    );
  }

  // ---- Con pedidos: resumen + activos + historial ----
  const active = orders.filter((o) => {
    const d = orderDisplay(o);
    return d === "pendiente" || d === "en_reparto";
  });
  const history = orders.filter((o) => {
    const d = orderDisplay(o);
    return d === "entregado" || d === "recibido" || d === "rechazado";
  });
  const entregadas = orders.filter((o) => {
    const d = orderDisplay(o);
    return d === "entregado" || d === "recibido";
  }).length;
  // "Enviado" cuenta solo lo que ya llegó a la familia (entregado/recibido),
  // no lo pendiente ni lo que está en camino.
  const totalEnviado = orders
    .filter((o) => {
      const d = orderDisplay(o);
      return d === "entregado" || d === "recibido";
    })
    .reduce((s, o) => s + Number(o.amount_usd), 0);

  // Envío en curso destacado (el más reciente) al tope.
  const featuredActive = active[0] ?? null;
  const featuredStage: 1 | 2 = featuredActive
    ? orderDisplay(featuredActive) === "en_reparto"
      ? 2
      : 1
    : 1;
  const featuredRate = featuredActive
    ? Number(
        rates.find((r) => r.currency === featuredActive.delivery_currency)
          ?.rate ?? 0
      )
    : 0;
  const otherActive = featuredActive
    ? active.filter((o) => o.id !== featuredActive.id)
    : active;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mis pedidos"
        subtitle="Sigue el estado de tus envíos"
        icon={Send}
      />

      {/* Envío en curso destacado */}
      {featuredActive && (
        <ActiveOrderCard
          order={featuredActive}
          rate={featuredRate}
          stage={featuredStage}
          transferBonusPct={settings.transfer_bonus_pct}
        />
      )}

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2">
        <Stat
          icon={Truck}
          label="En proceso"
          value={String(active.length)}
          tone="info"
        />
        <Stat
          icon={CheckCircle2}
          label="Entregadas"
          value={String(entregadas)}
          tone="income"
        />
        <Stat
          icon={Send}
          label="Enviado"
          value={usd(totalEnviado)}
          tone="primary"
        />
      </div>

      {/* Progreso hacia el próximo descuento por puntos */}
      {points.balance > 0 && (
        <PointsProgress
          balance={points.balance}
          redeemMin={redeemMin}
          pointValue={pointValue}
        />
      )}

      {/* Otros activos */}
      {otherActive.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Otros activos
          </h2>
          <div className="space-y-3">
            {otherActive.map((o) => (
              <Card key={o.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {usd(Number(o.amount_usd))}
                      {o.delivery_currency ? (
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          en {o.delivery_currency}
                        </span>
                      ) : null}
                      {methodTag(o.delivery_currency, o.delivery_method) && (
                        <span className="ml-1 text-xs font-semibold text-primary">
                          {methodTag(o.delivery_currency, o.delivery_method)}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Para {o.beneficiary_name || "—"}
                      {o.province ? ` · ${o.province}` : ""}
                    </p>
                    <OrderEta order={o} className="mt-1" />
                    {o.discount_usd ? (
                      <p className="mt-0.5 text-xs font-semibold text-income">
                        🎁 Descuento por puntos: −{usd(Number(o.discount_usd))}
                      </p>
                    ) : o.redeem && o.status === "pendiente" ? (
                      <p className="mt-0.5 text-xs text-primary">
                        Pediste usar tus puntos
                      </p>
                    ) : null}
                  </div>
                  <OrderStatusBadge order={o} />
                </div>

                <div className="border-t border-border pt-3">
                  <OrderTimeline
                    status={o.status}
                    created_at={o.created_at}
                    accepted_at={o.accepted_at}
                    delivered_at={o.delivered_at}
                    received_at={o.received_at}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {o.status === "aceptado" && o.track_token && (
                    <ShareTrackButton token={o.track_token} />
                  )}
                  {o.status === "pendiente" && <CancelOrderButton id={o.id} />}
                  <OrderContactButton
                    order={o}
                    phone={contact.phone}
                    brand={contact.businessName}
                  />
                  <Link
                    href={`/c/pedidos/${o.id}`}
                    className="ml-auto flex items-center gap-0.5 text-xs font-semibold text-primary"
                  >
                    Ver detalle <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Historial (con buscador/filtro y repetir) */}
      {history.length > 0 && (
        <ClientOrderHistory
          orders={history}
          perUsd={perUsd}
          sendProps={{
            rates,
            pointsBalance: points.balance,
            redeemMin,
            pointValue,
            beneficiaries,
            transferBonusPct: settings.transfer_bonus_pct,
          }}
        />
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "primary" | "income" | "info";
}) {
  const toneCls =
    tone === "income"
      ? "bg-income/10 text-income"
      : tone === "info"
        ? "bg-info/10 text-info"
        : "bg-primary/10 text-primary";
  return (
    <Card className="flex flex-col items-center gap-1 p-3 text-center">
      <span
        className={
          "flex h-9 w-9 items-center justify-center rounded-full " + toneCls
        }
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="tabular truncate text-base font-bold text-foreground">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </Card>
  );
}

function HowStep({
  n,
  icon: Icon,
  title,
  desc,
}: {
  n: number;
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
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
