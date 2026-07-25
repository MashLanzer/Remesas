"use client";

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { returnRemittanceToOperator } from "@/app/actions";
import { useDialog } from "@/components/confirm";

// El repartidor devuelve una remesa que no puede entregar (queda sin asignar).
export function ReturnDeliveryButton({ id }: { id: string }) {
  const { confirm } = useDialog();
  const [pending, start] = useTransition();

  async function onClick() {
    const ok = await confirm({
      title: "Devolver al operador",
      message:
        "La remesa dejará de estar asignada a ti para que el operador la reasigne. ¿Continuar?",
      confirmLabel: "Devolver",
    });
    if (ok) start(() => returnRemittanceToOperator(id));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-2.5 text-sm font-semibold text-muted-foreground transition active:scale-[0.98] disabled:opacity-50"
    >
      <Undo2 className="h-4 w-4" /> Devolver al operador
    </button>
  );
}
