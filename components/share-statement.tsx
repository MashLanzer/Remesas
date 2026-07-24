"use client";

import { Share2 } from "lucide-react";
import { useDialog } from "@/components/confirm";

export function ShareStatement({ text }: { text: string }) {
  const { notify } = useDialog();

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Estado de cuenta", text });
        return;
      }
    } catch {
      /* cancelado por el usuario */
    }
    try {
      await navigator.clipboard.writeText(text);
      notify("Estado de cuenta copiado");
    } catch {
      /* nada */
    }
  }

  return (
    <button
      onClick={share}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition active:scale-[0.98]"
    >
      <Share2 className="h-4 w-4" /> Compartir estado de cuenta
    </button>
  );
}
