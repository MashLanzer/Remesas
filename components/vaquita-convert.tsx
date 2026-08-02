"use client";

import { useTransition } from "react";
import { Send } from "lucide-react";
import { convertVaquitaToOrder } from "@/app/actions";
import { useDialog } from "@/components/confirm";
import { usd } from "@/lib/utils";

// Convierte la vaquita en UN pedido por el total aportado (organizador).
export function VaquitaConvert({ id, total }: { id: string; total: number }) {
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
