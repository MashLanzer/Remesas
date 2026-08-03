"use client";

import { useTransition } from "react";
import { Send, Clock } from "lucide-react";
import { convertVaquitaToOrder } from "@/app/actions";
import { useDialog } from "@/components/confirm";
import { usd } from "@/lib/utils";

// Convierte la vaquita en UN pedido por el total. Solo se habilita cuando hay
// aportes y TODOS están confirmados por el negocio.
export function VaquitaConvert({
  id,
  total,
  allConfirmed,
  hasContributions,
}: {
  id: string;
  total: number;
  allConfirmed: boolean;
  hasContributions: boolean;
}) {
  const { confirm } = useDialog();
  const [pending, start] = useTransition();

  async function go() {
    const ok = await confirm({
      title: "Convertir en envío",
      message: `Se creará un pedido por ${usd(total)} al beneficiario. El negocio lo procesará como una remesa. ¿Continuar?`,
      confirmLabel: "Convertir",
    });
    if (ok) start(() => convertVaquitaToOrder(id));
  }

  if (!hasContributions) {
    return (
      <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-center text-xs text-muted-foreground">
        Aún no hay aportes para enviar.
      </p>
    );
  }

  if (!allConfirmed) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        <Clock className="h-4 w-4 shrink-0" />
        Podrás crear el envío cuando el negocio confirme todos los aportes.
      </div>
    );
  }

  return (
    <button
      onClick={go}
      disabled={pending || total <= 0}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-income py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
    >
      <Send className="h-4 w-4" />
      {pending ? "Creando envío…" : `Convertir en envío (${usd(total)})`}
    </button>
  );
}
