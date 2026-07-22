"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { cancelOrder } from "@/app/actions";

export function CancelOrderButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (confirm("¿Cancelar este pedido?")) start(() => cancelOrder(id));
      }}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition active:scale-95 disabled:opacity-50"
    >
      <X className="h-3.5 w-3.5" /> Cancelar pedido
    </button>
  );
}
