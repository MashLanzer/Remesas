import { getRemittances, getSettlements } from "@/lib/data";
import { calcPartnerBalance } from "@/lib/calc";
import { usd } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import { SettlementView } from "@/components/settlement-view";

export const dynamic = "force-dynamic";

export default async function SociosPage() {
  const [remittances, settlements] = await Promise.all([
    getRemittances(),
    getSettlements(),
  ]);

  const balance = calcPartnerBalance(remittances, settlements);
  const owedToPartner = balance > 0;

  // Desglose informativo
  const totalDelivered = remittances.reduce((s, r) => s + Number(r.amount_usd), 0);
  const partnerProfit = remittances.reduce((s, r) => s + Number(r.partner_share), 0);
  const sentToCuba = settlements
    .filter((s) => s.direction === "us_to_cuba")
    .reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div>
      <PageHeader title="Cuenta de socios" subtitle="Saldo con tu amigo en Cuba" />

      <Card
        className={
          "mb-4 text-center " +
          (Math.abs(balance) < 0.01
            ? "border-slate-200 bg-slate-50"
            : owedToPartner
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50")
        }
      >
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {Math.abs(balance) < 0.01
            ? "Cuentas saldadas"
            : owedToPartner
            ? "Le debes a tu socio"
            : "Tu socio te debe"}
        </p>
        <p
          className={
            "mt-1 text-3xl font-bold " +
            (owedToPartner ? "text-red-600" : "text-emerald-600")
          }
        >
          {usd(Math.abs(balance))}
        </p>
      </Card>

      <Card className="mb-6 space-y-2.5">
        <Row label="Total entregado en Cuba (capital del socio)" value={usd(totalDelivered)} />
        <Row label="+ Ganancia del socio acumulada" value={usd(partnerProfit)} />
        <Row label="− Ya enviado a Cuba (liquidaciones)" value={usd(sentToCuba)} />
        <div className="my-1 border-t border-slate-100" />
        <Row label="= Saldo a favor del socio" value={usd(balance)} strong />
      </Card>

      <SettlementView settlements={settlements} />
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
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span
        className={
          "whitespace-nowrap " +
          (strong ? "font-semibold text-slate-900" : "text-slate-900")
        }
      >
        {value}
      </span>
    </div>
  );
}
