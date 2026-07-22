"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareTrackButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/t/${token}`;
    const text = `Sigue tu remesa aquí: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Seguimiento de tu remesa", text, url });
        return;
      }
    } catch {
      /* cancelado */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* nada */
    }
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary transition active:scale-95"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "¡Copiado!" : "Compartir seguimiento"}
    </button>
  );
}
