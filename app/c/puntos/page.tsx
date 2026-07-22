import Link from "next/link";
import { ArrowLeft, Star, Gift, Send, Settings2 } from "lucide-react";
import { getMyPoints } from "@/lib/data";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

function reasonMeta(reason: string | null) {
  switch (reason) {
    case "remesa":
      return { label: "Envío entregado", icon: Send };
    case "canje":
      return { label: "Canje", icon: Gift };
    default:
      return { label: "Ajuste", icon: Settings2 };
  }
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PuntosPage() {
  const { balance, entries } = await getMyPoints();

  return (
    <div>
      <Link
        href="/c"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>
      <PageHeader title="Mis puntos" />

      {/* Saldo */}
      <div className="mb-5 rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 p-5 text-white shadow-xl">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white/75">
          <Star className="h-4 w-4" /> Tienes
        </p>
        <p className="tabular mt-1 text-4xl font-extrabold">{balance} puntos</p>
        <p className="mt-1 text-xs text-white/70">
          Ganas puntos con cada remesa entregada. Úsalos al pedir tu próxima
          remesa para un descuento.
        </p>
      </div>

      <h2 className="mb-2 text-sm font-bold text-foreground">Historial</h2>
      {entries.length === 0 ? (
        <EmptyState
          title="Sin movimientos"
          description="Cuando se entregue tu primera remesa, ganarás puntos aquí."
        />
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const m = reasonMeta(e.reason);
            const Icon = m.icon;
            const positive = e.delta >= 0;
            return (
              <Card key={e.id} className="flex items-center gap-3 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {when(e.created_at)}
                  </p>
                </div>
                <span
                  className={
                    "tabular text-sm font-bold " +
                    (positive ? "text-income" : "text-destructive")
                  }
                >
                  {positive ? "+" : ""}
                  {e.delta}
                </span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
