import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, BadgeCheck, XCircle } from "lucide-react";
import { OrderChat } from "@/components/order-chat";
import { OrderDetailTabs } from "@/components/order-detail-tabs";
import { OrderMapButton } from "@/components/order-map-button";
import { createClient } from "@/lib/supabase/server";
import {
  getMyOrder,
  getExchangeRates,
  getMyPoints,
  getMyBeneficiaries,
  getMyOperatorContact,
  getMyReviewMap,
  getDeliveryCode,
  getBusinessSettings,
  getMyOperatorPayment,
} from "@/lib/data";
import { getUnreadOrderCounts } from "@/app/actions";
import { PayInstructions } from "@/components/pay-instructions";
import { ReviewForm } from "@/components/review-form";
import { Card } from "@/components/ui";
import {
  OrderStatusBadge,
  orderDisplay,
} from "@/components/order-status-badge";
import { OrderTimeline } from "@/components/order-timeline";
import { OrderEta } from "@/components/order-eta";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { ShareTrackButton } from "@/components/share-track-button";
import { ShareReceipt } from "@/components/share-receipt";
import { EnviarRemesaCta } from "@/components/enviar-remesa-cta";
import { ConfettiBurst } from "@/components/confetti-burst";
import { transferFactor } from "@/lib/calc";
import { usd, localAmount, formatDate, methodTag, pointsForOrder } from "@/lib/utils";
import { getLang } from "@/lib/lang";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function MiPedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lang = await getLang();
  const tr = (s: string) => translate(lang, s);
  const supabase = await createClient();
  const [
    order,
    rates,
    points,
    cfgRes,
    beneficiaries,
    contact,
    reviewMap,
    settings,
    payment,
    payStateRes,
    unread,
  ] = await Promise.all([
    getMyOrder(id),
    getExchangeRates(),
    getMyPoints(),
    supabase.rpc("my_client_config"),
    getMyBeneficiaries(),
    getMyOperatorContact(),
    getMyReviewMap(),
    getBusinessSettings(),
    getMyOperatorPayment(),
    supabase.rpc("my_order_payment", { p_order: id }),
    getUnreadOrderCounts(),
  ]);
  if (!order) notFound();

  // Estado de pago (migración 0065). Tolerante si la función no existe aún.
  const payRow = (
    Array.isArray(payStateRes.data) ? payStateRes.data[0] : payStateRes.data
  ) as {
    marked_paid_at?: string | null;
    confirmed?: boolean;
    proof_url?: string | null;
  } | null;
  const paymentConfirmed = payRow?.confirmed === true;
  const paymentInformed = !!payRow?.marked_paid_at;
  const paymentProofUrl = payRow?.proof_url ?? order.payment_proof_url ?? null;

  const display = orderDisplay(order);
  const isDelivered = display === "entregado" || display === "recibido";
  const deliveryCode = order.remittance_id
    ? await getDeliveryCode(order.remittance_id)
    : null;

  const cfg = (Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data) as
    | { point_value_usd?: number | null; redeem_min_points?: number | null }
    | null;
  const pointValue = Number(cfg?.point_value_usd ?? 0.05) || 0.05;
  const redeemMin = Number(cfg?.redeem_min_points ?? 100) || 100;

  const baseRate =
    rates.find((r) => r.currency === order.delivery_currency)?.rate ?? 0;
  // La tasa efectiva sube si la familia recibe CUP por transferencia.
  const isTransfer =
    order.delivery_currency === "CUP" && order.delivery_method === "transferencia";
  const rate = isTransfer
    ? Number(baseRate) * transferFactor(settings.transfer_bonus_pct)
    : Number(baseRate);
  const receives = Number(order.amount_usd) * rate;
  const perUsd = Number(settings.points_per_usd ?? 0.2) || 0.2;
  const earnedPts = pointsForOrder(order.amount_usd, perUsd);
  const isRejected = order.status === "rechazado";
  const unreadCount = unread[order.id] ?? 0;

  // Tono del hero según el estado del pedido.
  const heroTone = isRejected
    ? "border-destructive/30 bg-destructive/5"
    : isDelivered
    ? "border-income/30 bg-income/10"
    : display === "en_reparto"
    ? "border-primary/30 bg-primary/5"
    : "border-border bg-card";

  // ───── Pestaña: Seguimiento ─────
  const seguimiento = (
    <div className="space-y-4">
      {/* Rechazado: aviso claro */}
      {isRejected && (
        <Card className="flex items-start gap-3 border-destructive/30 bg-destructive/5">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">
              {tr("Este pedido fue rechazado. Contacta al negocio.")}
            </p>
            {order.reject_reason && (
              <p className="mt-1 text-xs text-muted-foreground">
                {tr("Motivo:")} {order.reject_reason}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Ciclo de pago (mientras no esté rechazada ni entregada) */}
      {!isRejected &&
        (paymentConfirmed ? (
          <Card className="flex items-center gap-3 border-income/30 bg-income/10">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-income/15 text-income">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-income">{tr("Pago confirmado")}</p>
              <p className="text-xs text-muted-foreground">
                {tr("El negocio recibió tu pago de")} {usd(Number(order.amount_usd))}.
              </p>
            </div>
          </Card>
        ) : (
          !isDelivered && (
            <PayInstructions
              order={order}
              payment={payment}
              informed={paymentInformed}
              proofUrl={paymentProofUrl}
            />
          )
        ))}

      {/* Código de entrega */}
      {!isDelivered &&
        deliveryCode &&
        !deliveryCode.verified_at &&
        !deliveryCode.no_code_reason && (
          <Card className="border-primary/25 bg-primary/5 text-center">
            <div className="flex items-center justify-center gap-2 text-primary">
              <KeyRound className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">
                {tr("Código de entrega")}
              </p>
            </div>
            <p className="mt-1 font-mono text-3xl font-extrabold tracking-[0.35em] text-foreground">
              {deliveryCode.code}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr(
                "Pásaselo a tu familiar. El repartidor lo pedirá al entregar el dinero."
              )}
            </p>
          </Card>
        )}

      {/* Mapa en una hoja */}
      {!isRejected && (
        <OrderMapButton
          remittanceId={order.remittance_id}
          province={order.province}
          address={order.beneficiary_address}
          live={display === "en_reparto"}
          title={tr("Seguimiento en el mapa")}
          label={tr("Ver en el mapa")}
          sublabelLive={tr("Repartidor en vivo")}
          sublabelStatic={tr("Ubicación aproximada")}
        />
      )}

      {/* ¿Cuándo llega? + línea de tiempo (el timeline ya avisa del rechazo,
          así que en pedidos rechazados se omite para no duplicar el cartel) */}
      {!isRejected && (
        <Card className="space-y-3">
          <OrderEta order={order} />
          <OrderTimeline
            status={order.status}
            created_at={order.created_at}
            accepted_at={order.accepted_at}
            delivered_at={order.delivered_at}
            received_at={order.received_at}
          />
        </Card>
      )}

      {/* Puntos del envío (no aplica a rechazado/cancelado) */}
      {order.client_id && earnedPts > 0 && !isRejected && (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3.5 py-3 text-sm">
          <span className="text-lg">⭐</span>
          <span className="text-foreground">
            {isDelivered ? (
              <>
                {tr("Ganaste")}{" "}
                <span className="font-bold text-primary">
                  +{earnedPts} {tr("puntos")}
                </span>{" "}
                {tr("con este envío.")}
              </>
            ) : (
              <>
                {tr("Ganarás")}{" "}
                <span className="font-bold text-primary">
                  +{earnedPts} {tr("puntos")}
                </span>{" "}
                {tr("cuando se entregue.")}
              </>
            )}
          </span>
        </div>
      )}

      {/* Acciones contextuales */}
      {order.status === "aceptado" && order.track_token && (
        <ShareTrackButton token={order.track_token} />
      )}
      {order.status === "pendiente" && <CancelOrderButton id={order.id} />}

      {/* Acción principal: repetir el envío */}
      <EnviarRemesaCta
        rates={rates}
        pointsBalance={points.balance}
        redeemMin={redeemMin}
        pointValue={pointValue}
        beneficiaries={beneficiaries}
        variant="primary"
        label={tr("Enviar otra vez")}
        initial={{
          amount: String(order.amount_usd),
          currency: order.delivery_currency || undefined,
          name: order.beneficiary_name || undefined,
          phone: order.beneficiary_phone || undefined,
          province: order.province || undefined,
          address: order.beneficiary_address || undefined,
        }}
      />
    </div>
  );

  // ───── Pestaña: Chat (ocupa casi toda la pantalla) ─────
  const chat = (
    <Card>
      <OrderChat
        orderId={order.id}
        me="cliente"
        flow
        messagesClass="min-h-[calc(100dvh-22rem)]"
      />
    </Card>
  );

  // ───── Pestaña: Detalles ─────
  const detalles = (
    <div className="space-y-4">
      <Card className="space-y-2.5">
        <Row label={tr("Beneficiario")} value={order.beneficiary_name || "—"} />
        {order.beneficiary_phone && (
          <Row label={tr("Teléfono")} value={order.beneficiary_phone} />
        )}
        {order.province && <Row label={tr("Provincia")} value={order.province} />}
        {order.beneficiary_address && (
          <Row label={tr("Dirección")} value={order.beneficiary_address} />
        )}
        <Row
          label={tr("Cómo recibe")}
          value={`${order.delivery_currency || "—"}${
            methodTag(order.delivery_currency, order.delivery_method)
              ? ` · ${methodTag(order.delivery_currency, order.delivery_method)}`
              : order.delivery_currency === "CUP"
              ? ` · ${tr("efectivo")}`
              : ""
          }`}
        />
        {order.note && <Row label={tr("Nota")} value={order.note} />}
      </Card>

      {/* Desglose del monto */}
      {Number(rate) > 0 && (
        <Card className="space-y-2.5">
          <Row label={tr("Tú envías")} value={usd(Number(order.amount_usd))} />
          <Row
            label={tr("Tasa")}
            value={`${localAmount(Number(rate))} ${order.delivery_currency}/USD${
              isTransfer ? ` · 🏦 ${tr("transferencia")}` : ""
            }`}
          />
          {order.discount_usd ? (
            <Row
              label={tr("Descuento por puntos:")}
              value={`−${usd(Number(order.discount_usd))}`}
            />
          ) : null}
          <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2.5 text-sm">
            <span className="shrink-0 text-muted-foreground">
              {tr("Tu familia recibe hasta")}
            </span>
            <span className="min-w-0 truncate text-right font-bold text-foreground">
              {localAmount(receives)} {order.delivery_currency}
            </span>
          </div>
        </Card>
      )}

      {/* Calificación (solo entregado) */}
      {isDelivered && (
        <ReviewForm orderId={order.id} initialRating={reviewMap[order.id] ?? 0} />
      )}

      {/* Comprobante de entrega */}
      {isDelivered && Number(rate) > 0 && (
        <ShareReceipt
          data={{
            brand: contact.businessName || "Giro",
            date: formatDate(order.delivered_at || order.created_at),
            beneficiaryName: order.beneficiary_name,
            province: order.province,
            amountUsd: usd(Number(order.amount_usd)),
            delivered: `${localAmount(receives)} ${order.delivery_currency}`,
            status: "entregado",
            refNumber: order.id.slice(0, 8).toUpperCase(),
            rate: `${localAmount(Number(rate))} ${order.delivery_currency}/USD`,
          }}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {isDelivered && <ConfettiBurst id={order.id} />}
      <Link
        href="/c/pedidos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {tr("Mis pedidos")}
      </Link>

      {/* Hero de estado */}
      <div className={"rounded-3xl border p-5 " + heroTone}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-3xl font-extrabold text-foreground">
              {usd(Number(order.amount_usd))}
            </p>
            <p className="text-sm text-muted-foreground">
              {tr("Para")} {order.beneficiary_name || "—"}
            </p>
          </div>
          <OrderStatusBadge order={order} />
        </div>
        {Number(rate) > 0 && !isRejected && (
          <div className="mt-4 rounded-2xl bg-background/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {tr("Tu familia recibe hasta")}
            </p>
            <p className="text-2xl font-extrabold text-foreground">
              {localAmount(receives)} {order.delivery_currency}
              {isTransfer && (
                <span className="ml-1.5 align-middle text-sm font-semibold text-primary">
                  🏦
                </span>
              )}
            </p>
            {order.discount_usd ? (
              <p className="mt-1 text-xs font-semibold text-income">
                🎁 {tr("Descuento por puntos:")} −{usd(Number(order.discount_usd))}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Pestañas */}
      <OrderDetailTabs
        tabs={[
          { key: "seguimiento", label: tr("Seguimiento"), content: seguimiento },
          { key: "chat", label: tr("Chat"), badge: unreadCount, content: chat },
          { key: "detalles", label: tr("Detalles"), content: detalles },
        ]}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
