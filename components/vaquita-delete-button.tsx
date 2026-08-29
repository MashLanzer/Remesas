"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteVaquita } from "@/app/actions";
import { useDialog } from "@/components/confirm";

// Borra la vaquita (solo el organizador, mientras no se haya convertido en
// pedido). Avisa que se eliminarán también los aportes registrados.
export function VaquitaDeleteButton({
  id,
  hasContributions,
}: {
  id: string;
  hasContributions: boolean;
}) {
  const { confirm } = useDialog();
  const [pending, start] = useTransition();

  async function go() {
    const ok = await confirm({
      title: "Borrar vaquita",
      message: hasContributions
        ? "Se eliminará la vaquita y todos sus aportes registrados. Esta acción no se puede deshacer."
        : "Se eliminará esta vaquita. Esta acción no se puede deshacer.",
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (ok) start(() => deleteVaquita(id));
  }

  return (
    <button
      onClick={go}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-2.5 text-sm font-semibold text-destructive transition active:scale-[0.98] disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Borrando…" : "Borrar vaquita"}
    </button>
  );
}
