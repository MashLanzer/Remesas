import { AlertTriangle } from "lucide-react";
import { calcPartnerBalance } from "@/lib/calc";
import { usd } from "@/lib/utils";
import { Card } from "@/components/ui";
import { SettlementView } from "@/components/settlement-view";
import { MovementsView, type Movement } from "@/components/movements-view";
import type { BusinessSettings, Remittance, Settlement } from "@/lib/types";

export function CuentasView({
  remittances,
  settlements,
  settings,
  perspective = "operador",
  delivererId,
  canSettle = true,
}: {
  remittances: Remittance[];
  settlements: Settlement[];
  settings: BusinessSettings;
  perspective?: "operador" | "repartidor";
  delivererId?: string | null;
  canSettle?: boolean;
}) {
  const isRep = perspective === "repartidor";
  const partnerName = settings.partner_name?.trim() || null;
  const toCuba = partnerName ? `a ${partnerName}` : "a Cuba";

  const balance = calcPartnerBalance(remittances, settlements);
  const owed = balance > 0;
  const settled = Math.abs(balance) < 0.01;

  // Solo las remesas ya entregadas mueven capital/ganancia (igual que el saldo).
  const settledRems = remittances.filter((r) => r.status !== "pendiente");
  const totalDelivered = settledRems.reduce(
    (s, r) => s + Math.max(0, Number(r.amount_usd) - Number(r.commission)),
    0
  );
  const partnerProfit = settledRems.reduce((s, r) => s + Number(r.partner_share), 0);
  const myProfit = settledRems.reduce((s, r) => s + Number(r.my_share), 0);
  const sentToCuba = settlements
    .filter((s) => s.direction === "us_to_cuba")
    .reduce((s, x) => s + Number(x.amount), 0);
  const receivedFromCuba = settlements
    .filter((s) => s.direction === "cuba_to_us")
    .reduce((s, x) => s + Number(x.amount), 0);

  const totalOwed = totalDelivered + partnerProfit;
  // Neto realmente saldado (lo enviado menos lo recibido de vuelta).
  const netSettled = sentToCuba - receivedFromCuba;
  const pctSettled =
    totalOwed > 0
      ? Math.min(Math.max((netSettled / totalOwed) * 100, 0), 100)
      : 0;

  const threshold = settings.settle_threshold ? Number(settings.settle_threshold) : 0;
  const overThreshold = !isRep && threshold > 0 && balance >= threshold;

  const movements: Movement[] = [
    ...remittances.map((r) => ({
      id: `r-${r.id}`,
      date: r.date,
      kind: "remesa" as const,
      label: r.beneficiary?.name || r.client?.name || "Remesa",
      delta:
        Number(r.amount_usd) - Number(r.commission) + Number(r.partner_share),
    })),
    ...settlements.map((s) => ({
      id: `s-${s.id}`,
      date: s.date,
      kind: s.direction === "us_to_cuba" ? ("pago" as const) : ("recibo" as const),
      label:
        s.direction === "us_to_cuba"
          ? isRep
            ? "Recibido del operador"
            : `Pago ${toCuba}`
          : isRep
          ? "Enviado al operador"
          : "Recibido de Cuba",
      delta: s.direction === "us_to_cuba" ? -Number(s.amount) : Number(s.amount),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const balanceTitle = settled
    ? "Cuentas saldadas"
    : owed
    ? isRep
      ? "Por cobrar al operador"
      : partnerName
      ? `Por enviar a ${partnerName}`
      : "Por enviar a Cuba"
    : isRep
    ? "Le debes al operador"
    : "A tu favor";

  return (
    <div className="space-y-5">
      {overThreshold && (
        <Card className="flex items-center gap-3 border-warning/30 bg-warning/10">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <p className="text-sm text-warning">
            El saldo pendiente ({usd(balance)}) pasó tu límite de {usd(threshold)}.
            Considera saldar.
          </p>
        </Card>
      )}

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
        <p className="tabular mt-1 text-4xl font-extrabold">{usd(Math.abs(balance))}</p>

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
            {usd(isRep ? partnerProfit : myProfit)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">
            {isRep ? "Entregado a familias" : "Ganado en Cuba"}
          </p>
          <p className="tabular mt-1 text-2xl font-bold text-foreground">
            {usd(isRep ? totalDelivered : partnerProfit)}
          </p>
        </Card>
      </div>

      {/* Desglose */}
      <Card className="space-y-2.5">
        <Row
          label={isRep ? "Tu capital entregado" : "Total entregado en Cuba (capital)"}
          value={usd(totalDelivered)}
        />
        <Row
          label={isRep ? "+ Tu ganancia" : "+ Ganancia generada en Cuba"}
          value={usd(partnerProfit)}
        />
        <Row
          label={isRep ? "− Ya recibido del operador" : `− Ya enviado ${toCuba}`}
          value={usd(sentToCuba)}
        />
        {receivedFromCuba > 0 && (
          <Row
            label={isRep ? "+ Enviado al operador" : "+ Recibido de Cuba"}
            value={usd(receivedFromCuba)}
          />
        )}
        <div className="my-1 border-t border-border" />
        <Row
          label={isRep ? "= Te deben" : "= Saldo pendiente"}
          value={usd(balance)}
          strong
        />
      </Card>

      {canSettle ? (
        <SettlementView
          settlements={settlements}
          suggested={owed ? Math.abs(balance) : 0}
          toCubaLabel={toCuba}
          delivererId={delivererId}
        />
      ) : (
        settlements.length > 0 && (
          <MovementsView movements={movements} />
        )
      )}

      {canSettle && <MovementsView movements={movements} />}
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
