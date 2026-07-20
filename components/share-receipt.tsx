"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui";

export function ShareReceipt({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    // Web Share API (funciona en Android/Chrome y en el APK).
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Comprobante de remesa", text });
        return;
      } catch {
        // El usuario canceló o no está disponible: caemos a copiar.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <Button variant="secondary" className="w-full" onClick={share}>
      {copied ? (
        <>
          <Check className="h-4 w-4" /> Copiado al portapapeles
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" /> Compartir comprobante
        </>
      )}
    </Button>
  );
}
