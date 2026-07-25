import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  MessageCircle,
  Copy,
  Users,
  Phone,
  MapPin,
  StickyNote,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { getRemittance, getSessionContext, getBusinessSettings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { usd, localAmount, formatDate } from "@/lib/utils";
import { Card, Badge } from "@/components/ui";
import { RemittanceActions } from "@/components/remittance-actions";
import { RemittanceStepper } from "@/components/remittance-stepper";
import { DeliverSheet } from "@/components/deliver-sheet";
import { EnRouteToggle } from "@/components/en-route-toggle";
import { IncidentButton } from "@/components/incident-button";
import { ReturnDeliveryButton } from "@/components/return-delivery-button";
import { CopyBeneficiary } from "@/components/copy-beneficiary";
import { ShareReceipt } from "@/components/share-receipt";
import { ShareTrackButton } from "@/components/share-track-button";
import { ClientPaidToggle } from "@/components/client-paid-toggle";
import { SmartImage } from "@/components/smart-image";
import type { RemittanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusTone: Record<RemittanceStatus, "amber" | "emerald" | "blue"> = {
  pendiente: "amber",
  entregado: "emerald",
  liquidado: "blue",
};

export default async function RemesaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ share?: string }>;
}) {
  const { id } = await params;
  const { share } = (await searchParams) ?? {};
  const r = await getRemittance(id);
  if (!r) notFound();

  const [ctx, settings] = await Promise.all([
    getSessionContext(),
    getBusinessSettings(),
  ]);
  const ids = [r.created_by, r.deliverer_id].filter(Boolean) as string[];
  const names: Record<string, string> = {};
  if (ids.length) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const p of (data as { id: string; full_name: string | null }[]) ?? []) {
      names[p.id] = p.full_name || "—";
    }
  }
  const creatorName = r.created_by ? names[r.created_by] : null;
  const delivererName = r.deliverer_id ? names[r.deliverer_id] : null;

  // Pedido vinculado (si nació de la app del cliente): confirmación de la familia.
  const supabaseOrder = await createClient();
  const { data: linkedOrder } = await supabaseOrder
    .from("orders")
    .select("received_at, track_token")
    .eq("remittance_id", r.id)
    .maybeSingle();
  const familyReceived = !!(linkedOrder as { received_at?: string | null } | null)
    ?.received_at;
  const trackToken =
    (linkedOrder as { track_token?: string | null } | null)?.track_token ?? null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/remesas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Remesas
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/remesas/nueva?dup=${r.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition active:scale-95"
          >
            <Copy className="h-3.5 w-3.5" /> Duplicar
          </Link>
          <Link
            href={`/remesas/${r.id}/editar`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition active:scale-95"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Link>
        </div>
      </div>

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {usd(r.amount_usd)}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate(r.date)}</p>
        </div>
        <Badge tone={statusTone[r.status]}>{r.status}</Badge>
      </div>

      {!ctx.isOperador && <RemittanceStepper status={r.status} />}

      {/* Confirmación de la familia (pedidos con seguimiento) */}
      {familyReceived ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-income/25 bg-income/5 p-3.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-income" />
          <p className="text-sm font-semibold text-foreground">
            Confirmado por la familia ✓
          </p>
        </div>
      ) : (
        trackToken &&
        (r.status === "entregado" || r.status === "liquidado") && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5">
            <p className="min-w-0 text-sm text-muted-foreground">
              La familia aún no confirma. Pídeles que confirmen desde el enlace.
            </p>
            <ShareTrackButton token={trackToken} />
          </div>
        )
      )}

      {r.status === "pendiente" && r.last_incident && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/5 p-3.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              Último intento fallido
              {r.incident_count && r.incident_count > 1
                ? ` · ${r.incident_count} intentos`
                : ""}
            </p>
            <p className="mt-0.5 text-sm text-foreground">{r.last_incident}</p>
          </div>
        </div>
      )}

      {/* Contacto rápido con el beneficiario */}
      {ctx.isOperador ? (
        r.beneficiary?.phone && (
          <a
            href={`https://wa.me/${r.beneficiary.phone.replace(
              /\D/g,
              ""
            )}?text=${encodeURIComponent(
              `Hola, la remesa de ${usd(r.amount_usd)} está ${r.status}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-income px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp al beneficiario
          </a>
        )
      ) : (
        (r.beneficiary?.phone || r.beneficiary?.province) && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {r.beneficiary?.phone ? (
              <a
                href={`https://wa.me/${r.beneficiary.phone.replace(
                  /\D/g,
                  ""
                )}?text=${encodeURIComponent(
                  `Hola, la remesa de ${usd(r.amount_usd)} está ${r.status}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-income/10 py-3 text-xs font-semibold text-income transition active:scale-95"
              >
                <MessageCircle className="h-5 w-5" /> WhatsApp
              </a>
            ) : (
              <span className="flex flex-col items-center justify-center gap-1 rounded-xl bg-muted py-3 text-xs font-semibold text-muted-foreground opacity-50">
                <MessageCircle className="h-5 w-5" /> WhatsApp
              </span>
            )}
            {r.beneficiary?.phone ? (
              <a
                href={`tel:${r.beneficiary.phone.replace(/[^\d+]/g, "")}`}
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-primary/10 py-3 text-xs font-semibold text-primary transition active:scale-95"
              >
                <Phone className="h-5 w-5" /> Llamar
              </a>
            ) : (
              <span className="flex flex-col items-center justify-center gap-1 rounded-xl bg-muted py-3 text-xs font-semibold text-muted-foreground opacity-50">
                <Phone className="h-5 w-5" /> Llamar
              </span>
            )}
            {r.beneficiary?.address || r.beneficiary?.province ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [r.beneficiary.address, r.beneficiary.province, "Cuba"]
                    .filter(Boolean)
                    .join(", ")
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-info/10 py-3 text-xs font-semibold text-info transition active:scale-95"
              >
                <MapPin className="h-5 w-5" /> Mapa
              </a>
            ) : (
              <span className="flex flex-col items-center justify-center gap-1 rounded-xl bg-muted py-3 text-xs font-semibold text-muted-foreground opacity-50">
                <MapPin className="h-5 w-5" /> Mapa
              </span>
            )}
          </div>
        )
      )}

      {!ctx.isOperador && r.beneficiary?.notes && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/5 p-3.5">
          <StickyNote className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              Nota del beneficiario
            </p>
            <p className="mt-0.5 whitespace-pre-line text-sm text-foreground">
              {r.beneficiary.notes}
            </p>
          </div>
        </div>
      )}

      <Card className="mb-4 space-y-2.5">
        <Row label="Cliente" value={r.client?.name || "—"} />
        <Row label="Beneficiario" value={r.beneficiary?.name || "—"} />
        {r.beneficiary?.province && (
          <Row label="Provincia" value={r.beneficiary.province} />
        )}
        {r.beneficiary?.address && (
          <Row label="Dirección" value={r.beneficiary.address} />
        )}
        <Row label="Método de pago" value={r.payment_method || "—"} />
        {r.beneficiary?.name && (
          <Link
            href={`/remesas?q=${encodeURIComponent(r.beneficiary.name)}`}
            className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-primary"
          >
            <Users className="h-3.5 w-3.5" /> Ver remesas de{" "}
            {r.beneficiary.name}
          </Link>
        )}
        {!ctx.isOperador && r.beneficiary?.name && (
          <CopyBeneficiary
            text={[
              r.beneficiary.name,
              r.beneficiary.phone || null,
              r.beneficiary.address || null,
              r.beneficiary.province || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
      </Card>

      {/* Cobro al cliente — solo el operador marca (él recibe el dinero) */}
      <Card className="mb-4">
        {ctx.isOperador ? (
          <ClientPaidToggle id={r.id} paid={r.client_paid !== false} />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cobro al cliente</span>
            <Badge tone={r.client_paid !== false ? "emerald" : "amber"}>
              {r.client_paid !== false ? "Cobrado" : "Por cobrar"}
            </Badge>
          </div>
        )}
      </Card>

      {/* Quién creó / entrega */}
      {(creatorName || delivererName) && (
        <Card className="mb-4 space-y-2.5">
          {creatorName && <Row label="Creada por" value={creatorName} />}
          {delivererName && <Row label="Repartidor" value={delivererName} />}
        </Card>
      )}

      <Card className="mb-4 space-y-2.5">
        <Row label="Monto del envío (paga el cliente)" value={usd(r.amount_usd)} strong />
        <Row label="− Comisión" value={usd(r.commission)} />
        <Row
          label="= Se entrega a la familia"
          value={usd(Number(r.amount_usd) - Number(r.commission))}
        />
        <div className="my-1 border-t border-border" />
        <Row
          label={`Entregado (${r.delivery_currency})`}
          value={`${localAmount(r.local_amount)} ${r.delivery_currency}`}
        />
        <Row label="Tasa" value={localAmount(r.exchange_rate)} />
      </Card>

      <Card className="mb-4 space-y-2.5 border-income/30 bg-income/10">
        <Row label="Ganancia por comisión" value={usd(r.commission)} />
        {Number(r.exchange_profit) > 0 && (
          <Row label="Ganancia por cambio" value={usd(r.exchange_profit)} />
        )}
        <Row label="Ganancia total" value={usd(r.total_profit)} strong />
        <div className="my-1 border-t border-income/30" />
        <Row label={`Tu parte (${r.my_split_percent}%)`} value={usd(r.my_share)} />
        <Row
          label={`Parte de Cuba (${100 - Number(r.my_split_percent)}%)`}
          value={usd(r.partner_share)}
        />
      </Card>

      {r.notes && (
        <Card className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notas
          </p>
          <p className="mt-1 text-sm text-foreground">{r.notes}</p>
        </Card>
      )}

      {r.receipt_url && (
        <Card className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Comprobante de pago del cliente
          </p>
          <SmartImage
            src={r.receipt_url}
            alt="Comprobante de pago"
            className="w-full rounded-xl border border-border"
          />
        </Card>
      )}

      {(r.received_by_name || r.received_by_id) && (
        <Card className="mb-4 space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recibido por
          </p>
          {r.received_by_name && (
            <Row label="Nombre" value={r.received_by_name} />
          )}
          {r.received_by_id && (
            <Row label="Carné (CI)" value={r.received_by_id} />
          )}
        </Card>
      )}

      {r.id_photo_url && (
        <Card className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Foto del carné
          </p>
          <SmartImage
            src={r.id_photo_url}
            alt="Foto del carné"
            className="w-full rounded-xl border border-border"
          />
        </Card>
      )}

      {r.signature_url && (
        <Card className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Firma de recepción
          </p>
          <SmartImage
            src={r.signature_url}
            alt="Firma de recepción"
            className="w-full rounded-xl border border-border bg-white"
          />
        </Card>
      )}

      {r.delivery_proof_url && (
        <Card className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Comprobante de entrega
          </p>
          <SmartImage
            src={r.delivery_proof_url}
            alt="Comprobante de entrega"
            className="w-full rounded-xl border border-border"
          />
        </Card>
      )}

      <div className="mb-4">
        <ShareReceipt
          autoOpen={share === "1"}
          data={{
            brand: settings.business_name || "Giro",
            date: formatDate(r.date),
            clientName: r.client?.name ?? null,
            clientPhone: r.client?.phone ?? null,
            beneficiaryName: r.beneficiary?.name ?? null,
            province: r.beneficiary?.province ?? null,
            amountUsd: usd(r.amount_usd),
            delivered: `${localAmount(r.local_amount)} ${r.delivery_currency}`,
            status: r.status,
          }}
        />
      </div>

      {/* Repartidor: "en camino" + confirmación de entrega cuando está pendiente */}
      {!ctx.isOperador && r.status === "pendiente" && (
        <EnRouteToggle
          id={r.id}
          enRoute={!!r.en_route_at}
          beneficiaryName={r.beneficiary?.name ?? null}
          beneficiaryPhone={r.beneficiary?.phone ?? null}
        />
      )}
      {!ctx.isOperador && r.status === "pendiente" && (
        <DeliverSheet
          id={r.id}
          beneficiaryName={r.beneficiary?.name ?? null}
          province={r.beneficiary?.province ?? null}
          amountUsd={usd(r.amount_usd)}
          delivered={`${localAmount(r.local_amount)} ${r.delivery_currency}`}
        />
      )}
      {!ctx.isOperador && r.status === "pendiente" && (
        <IncidentButton id={r.id} />
      )}
      {!ctx.isOperador && r.status === "pendiente" && r.deliverer_id && (
        <ReturnDeliveryButton id={r.id} />
      )}

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Cambiar estado
      </div>
      <RemittanceActions id={r.id} current={r.status} />
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-foreground" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}
