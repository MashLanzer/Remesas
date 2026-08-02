"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

// Comparte el enlace público de la vaquita (WhatsApp / copiar).
export function VaquitaShare({ token, title }: { token: string; title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url =
      (typeof window !== "undefined" ? window.location.origin : "") +
      `/v/${token}`;
    const text = `Aporta a la vaquita para ${title}: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Vaquita familiar", text, url });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nada */
    }
  }
  return (
    <button
      onClick={share}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Enlace copiado" : "Compartir enlace para aportar"}
    </button>
  );
}
