"use client";

import { MessageCircle } from "lucide-react";
import { useT } from "@/components/lang-provider";
import type { Order } from "@/lib/types";

// Botón "¿Dudas de este envío?" que abre WhatsApp del negocio con el pedido ya
// citado (monto, beneficiario, referencia), para que el cliente no tenga que
// explicar de qué habla.
export function OrderContactButton({
  order,
  phone,
  brand,
  className,
}: {
  order: Order;
  phone: string | null | undefined;
  brand?: string | null;
  className?: string;
}) {
  const tr = useT();
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const ref = order.id.slice(0, 8).toUpperCase();
  const text =
    `Hola${brand ? ` ${brand}` : ""}, tengo una duda sobre mi envío ` +
    `#${ref} de $${Number(order.amount_usd)} para ${
      order.beneficiary_name || "mi familia"
    }.`;
  return (
    <a
      href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={
        "flex items-center gap-1.5 rounded-lg border border-income/30 px-2.5 py-1.5 text-xs font-semibold text-income transition active:scale-95 " +
        (className ?? "")
      }
    >
      <MessageCircle className="h-3.5 w-3.5" /> {tr("Dudas de este envío")}
    </a>
  );
}
