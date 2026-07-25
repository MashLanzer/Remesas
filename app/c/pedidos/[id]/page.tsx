import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getMyOrder,
  getExchangeRates,
  getMyPoints,
  getMyBeneficiaries,
  getMyOperatorContact,
  getMyReviewMap,
} from "@/lib/data";
import { ReviewForm } from "@/components/review-form";
import { Card, PageHeader } from "@/components/ui";
import {
  OrderStatusBadge,
  orderDisplay,
} from "@/components/order-status-badge";
import { OrderTimeline } from "@/components/order-timeline";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { ShareTrackButton } from "@/components/share-track-button";
import { ShareReceipt } from "@/components/share-receipt";
import { EnviarRemesaCta } from "@/components/enviar-remesa-cta";
import { ConfettiBurst } from "@/components/confetti-burst";
import { usd, localAmount, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MiPedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [order, rates, points, cfgRes, beneficiaries, contact, reviewMap] =
    await Promise.all([
      getMyOrder(id),
      getExchangeRates(),
      getMyPoints(),
      supabase.rpc("my_client_config"),
      getMyBeneficiaries(),
      getMyOperatorContact(),
      getMyReviewMap(),
    ]);
  if (!order) notFound();

  const display = orderDisplay(order);
  const isDelivered = display === "entregado" || display === "recibido";

  const cfg = (Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data) as
    | { point_value_usd?: number | null; redeem_min_points?: number | null }
    | null;
  const pointValue = Number(cfg?.point_value_usd ?? 0.05) || 0.05;
  const redeemMin = Number(cfg?.redeem_min_points ?? 100) || 100;

  const rate =
    rates.find((r) => r.currency === order.delivery_currency)?.rate ?? 0;
  const receives = Number(order.amount_usd) * Number(rate);

  return (
    <div className="space-y-5">
      {isDelivered && <ConfettiBurst id={order.id} />}
      <Link
        href="/c/pedidos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Mis pedidos
      </Link>

      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title={usd(Number(order.amount_usd))}
          subtitle={`Para ${order.beneficiary_name || "—"}`}
        />
        <OrderStatusBadge order={order} />
      </div>

      {/* Estimado */}
      {Number(rate) > 0 && (
        <Card className="text-center">
          <p className="text-xs text-muted-foreground">Tu familia recibe hasta</p>
          <p className="text-2xl font-extrabold text-foreground">
            {localAmount(receives)} {order.delivery_currency}
          </p>
          {order.discount_usd ? (
            <p className="mt-1 text-xs font-semibold text-income">
              🎁 Descuento por puntos: −{usd(Number(order.discount_usd))}
            </p>
          ) : null}
        </Card>
      )}

      {/* Seguimiento */}
      <Card>
        <OrderTimeline
          status={order.status}
          created_at={order.created_at}
          accepted_at={order.accepted_at}
          delivered_at={order.delivered_at}
          received_at={order.received_at}
        />
      </Card>

      {/* Datos */}
      <Card className="space-y-2.5">
        <Row label="Beneficiario" value={order.beneficiary_name || "—"} />
        {order.beneficiary_phone && (
          <Row label="Teléfono" value={order.beneficiary_phone} />
        )}
        {order.province && <Row label="Provincia" value={order.province} />}
        <Row label="Moneda" value={order.delivery_currency || "—"} />
        {order.note && <Row label="Nota" value={order.note} />}
      </Card>

      {order.status === "rechazado" && order.reject_reason && (
        <Card className="border-destructive/30 bg-destructive/5">
          <p className="text-sm font-semibold text-destructive">Rechazado</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Motivo: {order.reject_reason}
          </p>
        </Card>
      )}

      {/* Calificación del envío (solo entregado) */}
      {isDelivered && (
        <ReviewForm orderId={order.id} initialRating={reviewMap[order.id] ?? 0} />
      )}

      {/* Comprobante de entrega (foto) */}
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
          }}
        />
      )}

      {/* Acciones */}
      <div className="space-y-2">
        {order.status === "aceptado" && order.track_token && (
          <ShareTrackButton token={order.track_token} />
        )}
        {order.status === "pendiente" && <CancelOrderButton id={order.id} />}
        <EnviarRemesaCta
          rates={rates}
          pointsBalance={points.balance}
          redeemMin={redeemMin}
          pointValue={pointValue}
          beneficiaries={beneficiaries}
          variant="primary"
          label="Enviar otra vez"
          initial={{
            amount: String(order.amount_usd),
            currency: order.delivery_currency || undefined,
            name: order.beneficiary_name || undefined,
            phone: order.beneficiary_phone || undefined,
            province: order.province || undefined,
          }}
        />
      </div>
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
