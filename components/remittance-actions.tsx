"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { updateRemittanceStatus, deleteRemittance } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { RemittanceStatus } from "@/lib/types";
import { useDialog } from "@/components/confirm";

const statuses: { key: RemittanceStatus; label: string }[] = [
  { key: "pendiente", label: "Pendiente" },
  { key: "entregado", label: "Entregado" },
  { key: "liquidado", label: "Liquidado" },
];

export function RemittanceActions({
  id,
  current,
}: {
  id: string;
  current: RemittanceStatus;
}) {
  const [pending, start] = useTransition();
  const { confirm } = useDialog();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {statuses.map((s) => (
          <button
            key={s.key}
            disabled={pending}
            onClick={() => start(() => updateRemittanceStatus(id, s.key))}
            className={cn(
              "rounded-xl px-2 py-2.5 text-xs font-medium transition disabled:opacity-60",
              current === s.key
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Button
        variant="danger"
        className="w-full"
        disabled={pending}
        onClick={async () => {
          if (
            await confirm({
              title: "Eliminar remesa",
              message: "¿Eliminar esta remesa? No se puede deshacer.",
              confirmLabel: "Eliminar",
            })
          ) {
            start(() => deleteRemittance(id));
          }
        }}
      >
        <Trash2 className="h-4 w-4" /> Eliminar remesa
      </Button>
    </div>
  );
}
