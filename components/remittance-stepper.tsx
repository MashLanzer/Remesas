import { Truck, Check, CheckCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemittanceStatus } from "@/lib/types";

// Stepper horizontal grande del ciclo de una remesa, para el detalle.
const STEPS: { key: RemittanceStatus; label: string; icon: LucideIcon }[] = [
  { key: "pendiente", label: "Pendiente", icon: Truck },
  { key: "entregado", label: "Entregado", icon: Check },
  { key: "liquidado", label: "Liquidado", icon: CheckCheck },
];

export function RemittanceStepper({ status }: { status: RemittanceStatus }) {
  const stage = status === "liquidado" ? 3 : status === "entregado" ? 2 : 1;
  return (
    <div className="mb-4 flex items-center">
      {STEPS.map((step, i) => {
        const done = i < stage;
        const active = i === stage - 1;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition",
                  done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                  active && "ring-2 ring-primary/30"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  done ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "mx-1 h-0.5 flex-1 rounded-full",
                  i < stage - 1 ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
