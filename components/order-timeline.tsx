import { Check, Clock, Send, Truck, PartyPopper, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Step = { label: string; icon: LucideIcon; at: string | null; done: boolean };

export function OrderTimeline({
  status,
  created_at,
  accepted_at,
  delivered_at,
  received_at,
}: {
  status: string;
  created_at: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  received_at: string | null;
}) {
  if (status === "rechazado") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
        <XCircle className="h-4 w-4 shrink-0" />
        Este pedido fue rechazado. Contacta al negocio.
      </div>
    );
  }

  const steps: Step[] = [
    { label: "Pedido enviado", icon: Send, at: created_at, done: true },
    {
      label: "Aceptado por el negocio",
      icon: Check,
      at: accepted_at,
      done: !!accepted_at,
    },
    {
      label: "En reparto",
      icon: Truck,
      at: accepted_at,
      done: !!accepted_at && !delivered_at ? false : !!delivered_at,
    },
    {
      label: "Entregado a tu familia",
      icon: PartyPopper,
      at: delivered_at,
      done: !!delivered_at,
    },
    {
      label: "Recibido confirmado",
      icon: Check,
      at: received_at,
      done: !!received_at,
    },
  ];

  // El paso "En reparto" está activo (en curso) cuando ya se aceptó pero no se
  // ha entregado.
  const inTransit = !!accepted_at && !delivered_at;

  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const Icon = s.done ? s.icon : Clock;
        const active = s.label === "En reparto" && inTransit;
        const last = i === steps.length - 1;
        return (
          <li key={s.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
                  (s.done
                    ? "bg-income/15 text-income"
                    : active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground")
                }
              >
                <Icon className="h-4 w-4" />
              </span>
              {!last && (
                <span
                  className={
                    "my-0.5 w-0.5 flex-1 " +
                    (s.done ? "bg-income/40" : "bg-border")
                  }
                  style={{ minHeight: 18 }}
                />
              )}
            </div>
            <div className={last ? "" : "pb-4"}>
              <p
                className={
                  "text-sm font-medium " +
                  (s.done || active ? "text-foreground" : "text-muted-foreground")
                }
              >
                {s.label}
                {active && (
                  <span className="ml-2 text-xs font-normal text-primary">
                    en curso…
                  </span>
                )}
              </p>
              {s.done && s.at && (
                <p className="text-xs text-muted-foreground">{timeLabel(s.at)}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
