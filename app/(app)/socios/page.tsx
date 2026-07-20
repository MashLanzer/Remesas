import { Send, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getRemittances, getSettlements, getBusinessSettings } from "@/lib/data";
import { calcPartnerBalance } from "@/lib/calc";
import { usd, formatDate } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import { SettlementView } from "@/components/settlement-view";

export const dynamic = "force-dynamic";

type Movement = {
  id: string;
  date: string;
  kind: "remesa" | "pago" | "recibo";
  label: string;
  delta: number;
};

export default async function CuentasPage() {
  const [remittances, settlements, settings] = await Promise.all([
    getRemittances(),
    getSettlements(),
    getBusinessSettings(),
  ]);

  const partnerName = settings.partner_name?.trim() || null;
  const toCuba = partnerName ? `a ${partnerName}` : "a Cuba";

  const balance = calcPartnerBalance(remittances, settlements);
  const owed = balance > 0;
  const settled = Math.abs(balance) < 0.01;

  const totalDelivered = remittances.reduce((s, r) => s + Number(r.amount_usd), 0);
  const partnerProfit = remittances.reduce((s, r) => s + Number(r.partner_share), 0);
  const myProfit = remittances.reduce((s, r) => s + Number(r.my_share), 0);
  const sentToCuba = settlements
    .filter((s) => s.direction === "us_to_cuba")
    .reduce((s, x) => s + Number(x.amount), 0);

  const totalOwed = totalDelivered + partnerProfit;
  const pctSettled =
    totalOwed > 0 ? Math.min((sentToCuba / totalOwed) * 100, 100) : 0;

  // Movimientos (línea de tiempo)
  const movements: Movement[] = [
    ...remittances.map((r) => ({
      id: `r-${r.id}`,
      date: r.date,
      kind: "remesa" as const,
      label: r.beneficiary?.name || r.client?.name || "Remesa",
      delta: Number(r.amount_usd) + Number(r.partner_share),
    })),
    ...settlements.map((s) => ({
      id: `s-${s.id}`,
      date: s.date,
      kind: s.direction === "us_to_cuba" ? ("pago" as const) : ("recibo" as const),
      label: s.direction === "us_to_cuba" ? `Pago ${toCuba}` : "Recibido de Cuba",
      delta:
        s.direction === "us_to_cuba" ? -Number(s.amount) : Number(s.amount),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  const balanceTitle = settled
    ? "Cuentas saldadas"
    : owed
    ? partnerName
      ? `Por enviar a ${partnerName}`
      : "Por enviar a Cuba"
    : "A tu favor";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cuentas"
        subtitle={partnerName ? `Balance con ${partnerName}` : "Balance con Cuba"}
      />

      {/* Saldo destacado */}
      <div
        className={
          "rounded-3xl p-5 text-white shadow-xl " +
          (settled || !owed
            ? "hero-gradient shadow-primary/20"
            : "bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/20")
        }
      >
        <p className="text-sm font-medium text-white/75">{balanceTitle}</p>
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

      {/* Ganancias acumuladas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Has ganado tú</p>
          <p className="tabular mt-1 text-2xl font-bold text-income">
            {usd(myProfit)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Ganado en Cuba
          </p>
          <p className="tabular mt-1 text-2xl font-bold text-foreground">
            {usd(partnerProfit)}
          </p>
        </Card>
      </div>

      {/* Desglose */}
      <Card className="space-y-2.5">
        <Row label="Total entregado en Cuba (capital)" value={usd(totalDelivered)} />
        <Row label="+ Ganancia generada en Cuba" value={usd(partnerProfit)} />
        <Row label={`− Ya enviado ${toCuba}`} value={usd(sentToCuba)} />
        <div className="my-1 border-t border-border" />
        <Row label="= Saldo pendiente" value={usd(balance)} strong />
      </Card>

      <SettlementView
        settlements={settlements}
        suggested={owed ? Math.abs(balance) : 0}
        toCubaLabel={toCuba}
      />

      {/* Movimientos */}
      {movements.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold text-foreground">Movimientos</h2>
          <div className="space-y-2">
            {movements.map((m) => (
              <Card key={m.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "flex h-9 w-9 items-center justify-center rounded-full " +
                      (m.kind === "remesa"
                        ? "bg-warning/10 text-warning"
                        : m.kind === "pago"
                        ? "bg-info/10 text-info"
                        : "bg-income/10 text-income")
                    }
                  >
                    {m.kind === "remesa" ? (
                      <Send className="h-4 w-4" />
                    ) : m.kind === "pago" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(m.date)}
                    </p>
                  </div>
                </div>
                <span
                  className={
                    "tabular text-sm font-bold " +
                    (m.delta >= 0 ? "text-destructive" : "text-income")
                  }
                >
                  {m.delta >= 0 ? "+" : "−"}
                  {usd(Math.abs(m.delta))}
                </span>
              </Card>
            ))}
          </div>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            + sube lo que debes · − lo que ya pagaste
          </p>
        </div>
      )}
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
