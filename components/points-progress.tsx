import { Star } from "lucide-react";

// Barra de progreso hacia el próximo descuento por puntos. Engancha al cliente
// mostrándole cuánto le falta para canjear.
export function PointsProgress({
  balance,
  redeemMin,
  pointValue,
}: {
  balance: number;
  redeemMin: number;
  pointValue: number;
}) {
  const bal = Math.max(0, Math.floor(balance));
  const min = Math.max(1, Math.floor(redeemMin));
  const canRedeem = bal >= min;
  const pct = Math.min(100, Math.round((bal / min) * 100));
  const falta = Math.max(0, min - bal);

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Star className="h-4 w-4 text-primary" />
          {bal} puntos
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {canRedeem
            ? `¡Listo para canjear! (~${(bal * pointValue).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })})`
            : `Te faltan ${falta} para tu descuento`}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
