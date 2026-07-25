"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Copia los datos del beneficiario de un toque (útil al llegar a entregar).
export function CopyBeneficiary({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nada */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-primary transition active:scale-95"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-income" /> Copiado
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> Copiar datos del beneficiario
        </>
      )}
    </button>
  );
}
