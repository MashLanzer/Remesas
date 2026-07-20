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
  const settled = Math.abs(balance) < 0.01;

  const totalDelivered = remittances.reduce((s, r) => s + Number(r.amount_usd), 0);
  const partnerProfit = remittances.reduce(
    (s, r) => s + Number(r.partner_share),
    0
  );
  const sentToCuba = settlements
    .filter((s) => s.direction === "us_to_cuba")
    .reduce((s, x) => s + Number(x.amount), 0);

  const totalOwed = totalDelivered + partnerProfit;
  const pctSettled =
    totalOwed > 0 ? Math.min((sentToCuba / totalOwed) * 100, 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Cuenta de socios" subtitle="Saldo con tu amigo en Cuba" />

      {/* Saldo destacado */}
      <div
        className={
          "rounded-3xl p-5 text-white shadow-xl " +
          (settled
            ? "hero-gradient shadow-primary/20"
            : owedToPartner
            ? "bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/20"
            : "hero-gradient shadow-primary/20")
        }
      >
        <p className="text-sm font-medium text-white/75">
          {settled
            ? "Cuentas saldadas"
            : owedToPartner
            ? "Le debes a tu socio"
            : "Tu socio te debe"}
        </p>
        <p className="tabular mt-1 text-4xl font-extrabold">
          {usd(Math.abs(balance))}
        </p>

        {!settled && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-white/80">
              <span>Saldado</span>
              <span>{Math.round(pctSettled)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white/90"
                style={{ width: `${pctSettled}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Desglose */}
      <Card className="space-y-2.5">
        <Row
          label="Total entregado en Cuba (capital del socio)"
          value={usd(totalDelivered)}
        />
        <Row label="+ Ganancia del socio acumulada" value={usd(partnerProfit)} />
        <Row label="− Ya enviado a Cuba (liquidaciones)" value={usd(sentToCuba)} />
        <div className="my-1 border-t border-border" />
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
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          "tabular whitespace-nowrap " +
          (strong ? "font-bold text-foreground" : "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
