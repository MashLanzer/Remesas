"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Wallet, MessageCircle, Clock, HandCoins } from "lucide-react";
import { Card } from "@/components/ui";
import { clientMarkOrderPaid } from "@/app/actions";
import type { Order } from "@/lib/types";
import { useT } from "@/components/lang-provider";

type M = { k: string; v: string };

// Tarjeta "¿Cómo pago?" para el cliente: muestra los métodos de cobro del
// negocio (copiables), permite marcar "ya pagué" (queda registrado) y avisar
// por WhatsApp. El cobro real lo confirma el negocio.
export function PayInstructions({
  order,
  payment,
  informed = false,
}: {
  order: Order;
  payment: {
    businessName: string | null;
    phone: string | null;
    zelle: string | null;
    cashapp: string | null;
    paypal: string | null;
  };
  informed?: boolean;
}) {
  const tr = useT();
  const [copied, setCopied] = useState<string | null>(null);
  const [marked, setMarked] = useState(informed);
  const [saving, start] = useTransition();

  function markPaid() {
    setMarked(true);
    start(() => clientMarkOrderPaid(order.id));
  }

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
  const waText = `${tr("Hola")}${
    payment.businessName ? ` ${payment.businessName}` : ""
  }, ${tr("ya pagué mi envío")} #${ref} ${tr("de")} $${Number(order.amount_usd)} ${tr("para")} ${
    order.beneficiary_name || tr("mi familia")
  }.`;

  return (
    <Card className="space-y-3 border-primary/25 bg-primary/5">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-foreground">{tr("¿Cómo pagar tu envío?")}</p>
        <span
          className={
            "ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
            (marked
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-muted text-muted-foreground")
          }
        >
          <Clock className="h-3 w-3" /> {marked ? tr("Pago informado") : tr("Por pagar")}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {tr("Paga")}{" "}
        <span className="font-semibold text-foreground">
          ${Number(order.amount_usd)}
        </span>{" "}
        {tr("por cualquiera de estos medios y avísale al negocio.")}
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
              aria-label={`${tr("Copiar")} ${m.k}`}
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

      {marked ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-center text-xs font-medium text-amber-700 dark:text-amber-300">
          {tr("Avisaste que ya pagaste. El negocio confirmará el cobro y verás “Pagado” aquí.")}
        </div>
      ) : (
        <button
          type="button"
          onClick={markPaid}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-70"
        >
          <HandCoins className="h-4 w-4" /> {tr("Ya pagué")}
        </button>
      )}

      {digits && (
        <a
          href={`https://wa.me/${digits}?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-income py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          <MessageCircle className="h-4 w-4" /> {tr("Avisar por WhatsApp")}
        </a>
      )}
    </Card>
  );
}
