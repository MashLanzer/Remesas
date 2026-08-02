"use client";

import { useState } from "react";
import { Copy, Check, Wallet, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui";
import type { Order } from "@/lib/types";

type M = { k: string; v: string };

// Tarjeta "¿Cómo pago?" para el cliente: muestra los métodos de cobro del
// negocio (copiables) y un botón para avisar por WhatsApp que ya pagó, con el
// pedido citado. No cambia datos; el pago se coordina con el negocio.
export function PayInstructions({
  order,
  payment,
}: {
  order: Order;
  payment: {
    businessName: string | null;
    phone: string | null;
    zelle: string | null;
    cashapp: string | null;
    paypal: string | null;
  };
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const methods: M[] = [
    payment.zelle ? { k: "Zelle", v: payment.zelle } : null,
    payment.cashapp ? { k: "CashApp", v: payment.cashapp } : null,
    payment.paypal ? { k: "PayPal", v: payment.paypal } : null,
  ].filter(Boolean) as M[];

  if (methods.length === 0) return null;

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* nada */
    }
  }

  const ref = order.id.slice(0, 8).toUpperCase();
  const digits = (payment.phone || "").replace(/\D/g, "");
  const waText = `Hola${
    payment.businessName ? ` ${payment.businessName}` : ""
  }, ya pagué mi envío #${ref} de $${Number(order.amount_usd)} para ${
    order.beneficiary_name || "mi familia"
  }.`;

  return (
    <Card className="space-y-3 border-primary/25 bg-primary/5">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-foreground">¿Cómo pagar tu envío?</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Paga <span className="font-semibold text-foreground">$
        {Number(order.amount_usd)}</span> por cualquiera de estos medios y avísale
        al negocio.
      </p>

      <div className="space-y-2">
        {methods.map((m) => (
          <div
            key={m.k}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">
                {m.k}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {m.v}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copy(m.k, m.v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition active:scale-90"
              aria-label={`Copiar ${m.k}`}
            >
              {copied === m.k ? (
                <Check className="h-4 w-4 text-income" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {digits && (
        <a
          href={`https://wa.me/${digits}?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-income py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          <MessageCircle className="h-4 w-4" /> Ya pagué · avisar al negocio
        </a>
      )}
    </Card>
  );
}
