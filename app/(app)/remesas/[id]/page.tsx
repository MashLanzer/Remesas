import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, MessageCircle } from "lucide-react";
import { getRemittance } from "@/lib/data";
import { usd, localAmount, formatDate } from "@/lib/utils";
import { Card, Badge } from "@/components/ui";
import { RemittanceActions } from "@/components/remittance-actions";
import { ShareReceipt } from "@/components/share-receipt";
import type { RemittanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusTone: Record<RemittanceStatus, "amber" | "emerald" | "blue"> = {
  pendiente: "amber",
  entregado: "emerald",
  liquidado: "blue",
};

export default async function RemesaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getRemittance(id);
  if (!r) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/remesas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Remesas
        </Link>
        <Link
          href={`/remesas/${r.id}/editar`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition active:scale-95"
        >
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Link>
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

      {r.beneficiary?.phone && (
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
      )}

      <Card className="mb-4 space-y-2.5">
        <Row label="Cliente" value={r.client?.name || "—"} />
        <Row label="Beneficiario" value={r.beneficiary?.name || "—"} />
        {r.beneficiary?.province && (
          <Row label="Provincia" value={r.beneficiary.province} />
        )}
        <Row label="Método de pago" value={r.payment_method || "—"} />
      </Card>

      <Card className="mb-4 space-y-2.5">
        <Row label="Monto del envío" value={usd(r.amount_usd)} />
        <Row label="Comisión" value={usd(r.commission)} />
        <Row label="Cobrado al cliente" value={usd(r.total_received)} strong />
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
          label={`Parte del socio (${100 - Number(r.my_split_percent)}%)`}
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

      <div className="mb-4">
        <ShareReceipt
          text={[
            "🧾 Comprobante de remesa",
            `Fecha: ${formatDate(r.date)}`,
            `Beneficiario: ${r.beneficiary?.name || "—"}${
              r.beneficiary?.province ? " · " + r.beneficiary.province : ""
            }`,
            `Monto: ${usd(r.amount_usd)}`,
            `Entregado: ${localAmount(r.local_amount)} ${r.delivery_currency}`,
            `Estado: ${r.status}`,
          ].join("\n")}
        />
      </div>

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
