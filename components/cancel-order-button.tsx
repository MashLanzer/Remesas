"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { cancelOrder, cancelStoreOrder } from "@/app/actions";
import { useDialog } from "@/components/confirm";
import { useT } from "@/components/lang-provider";

export function CancelOrderButton({
  id,
  store = false,
}: {
  id: string;
  store?: boolean;
}) {
  const tr = useT();
  const [pending, start] = useTransition();
  const { confirm } = useDialog();
  return (
    <button
      onClick={async () => {
        if (
          await confirm({
            title: tr("Cancelar pedido"),
            message: tr("¿Cancelar este pedido?"),
            confirmLabel: tr("Sí, cancelar"),
          })
        )
          start(() => (store ? cancelStoreOrder(id) : cancelOrder(id)));
      }}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition active:scale-95 disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" /> {tr("Cancelar pedido")}
    </button>
  );
}
