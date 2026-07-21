"use client";

import { Share2 } from "lucide-react";

export function ShareCard({
  name,
  businessName,
  phone,
  zelle,
  cashapp,
  paypal,
}: {
  name?: string | null;
  businessName?: string | null;
  phone?: string | null;
  zelle?: string | null;
  cashapp?: string | null;
  paypal?: string | null;
}) {
  function buildText() {
    const lines: string[] = [];
    if (businessName) lines.push(`📇 ${businessName}`);
    if (name) lines.push(name);
    if (phone) lines.push(`📱 WhatsApp: ${phone}`);
    const pays: string[] = [];
    if (zelle) pays.push(`Zelle: ${zelle}`);
    if (cashapp) pays.push(`CashApp: ${cashapp}`);
    if (paypal) pays.push(`PayPal: ${paypal}`);
    if (pays.length) {
      lines.push("");
      lines.push("Métodos de pago:");
      lines.push(...pays);
    }
    return lines.join("\n");
  }

  async function share() {
    const text = buildText();
    if (!text.trim()) {
      alert("Añade tu teléfono o métodos de cobro primero.");
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      /* cancelado */
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("Tarjeta copiada al portapapeles");
    } catch {
      /* nada */
    }
  }

  return (
    <button
      onClick={share}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
    >
      <Share2 className="h-4 w-4" /> Compartir mi tarjeta
    </button>
  );
}
