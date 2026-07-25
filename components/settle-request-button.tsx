"use client";

import { useState, useTransition } from "react";
import { HandCoins, Check, MessageCircle } from "lucide-react";
import { requestSettlement } from "@/app/actions";
import { usd } from "@/lib/utils";

// "Listo para liquidar": el repartidor avisa al operador (registro + WhatsApp).
export function SettleRequestButton({
  amount,
  operatorPhone,
  operatorName,
}: {
  amount: number;
  operatorPhone: string | null;
  operatorName: string | null;
}) {
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const digits = operatorPhone?.replace(/\D/g, "") || "";
  const waHref = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(
        `Hola${operatorName ? ` ${operatorName}` : ""}, tengo ${usd(
          amount
        )} listo para liquidar. ¿Cuándo lo cuadramos?`
      )}`
    : null;

  function notifyOperator() {
    start(() => requestSettlement(amount));
    setSent(true);
    if (waHref) window.open(waHref, "_blank", "noopener,noreferrer");
  }

  if (sent) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-income/25 bg-income/5 py-3 text-sm font-semibold text-income">
        <Check className="h-4 w-4" /> Aviso enviado al operador
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={notifyOperator}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.98] disabled:opacity-70"
    >
      {waHref ? (
        <MessageCircle className="h-4 w-4" />
      ) : (
        <HandCoins className="h-4 w-4" />
      )}
      Listo para liquidar
    </button>
  );
}
