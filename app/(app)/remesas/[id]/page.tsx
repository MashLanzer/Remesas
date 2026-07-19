import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRemittance } from "@/lib/data";
import { usd, localAmount, formatDate } from "@/lib/utils";
import { Card, Badge } from "@/components/ui";
import { RemittanceActions } from "@/components/remittance-actions";
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
      <Link
        href="/remesas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" /> Remesas
      </Link>

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {usd(r.amount_usd)}
          </h1>
          <p className="text-sm text-slate-500">{formatDate(r.date)}</p>
        </div>
        <Badge tone={statusTone[r.status]}>{r.status}</Badge>
      </div>

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
        <div className="my-1 border-t border-slate-100" />
        <Row
          label={`Entregado (${r.delivery_currency})`}
          value={`${localAmount(r.local_amount)} ${r.delivery_currency}`}
        />
        <Row label="Tasa" value={localAmount(r.exchange_rate)} />
      </Card>

      <Card className="mb-4 space-y-2.5 border-emerald-200 bg-emerald-50">
        <Row label="Ganancia por comisión" value={usd(r.commission)} />
        {Number(r.exchange_profit) > 0 && (
          <Row label="Ganancia por cambio" value={usd(r.exchange_profit)} />
        )}
        <Row label="Ganancia total" value={usd(r.total_profit)} strong />
        <div className="my-1 border-t border-emerald-200" />
        <Row label={`Tu parte (${r.my_split_percent}%)`} value={usd(r.my_share)} />
        <Row
          label={`Parte del socio (${100 - Number(r.my_split_percent)}%)`}
          value={usd(r.partner_share)}
        />
      </Card>

      {r.notes && (
        <Card className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Notas
          </p>
          <p className="mt-1 text-sm text-slate-700">{r.notes}</p>
        </Card>
      )}

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
      <span className="text-slate-600">{label}</span>
      <span className={strong ? "font-semibold text-slate-900" : "text-slate-900"}>
        {value}
      </span>
    </div>
  );
}
