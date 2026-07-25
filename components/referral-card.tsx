"use client";

import { useState } from "react";
import { Gift, Share2, Copy, Check, Users } from "lucide-react";
import { Card } from "@/components/ui";

// Tarjeta de referidos del cliente: comparte tu link y ambos ganan puntos.
export function ReferralCard({
  code,
  invited,
  rewarded,
  bonus,
}: {
  code: string;
  invited: number;
  rewarded: number;
  bonus: number;
}) {
  const [copied, setCopied] = useState(false);

  function link() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/r/${code}`;
  }

  async function share() {
    const url = link();
    const text = `Te invito a Giro para enviar remesas a Cuba. Regístrate con mi enlace y los dos ganamos ${bonus} puntos: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Únete a Giro", text, url });
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

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nada */
    }
  }

  return (
    <Card className="space-y-3 overflow-hidden p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Gift className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            Invita y ganen {bonus} puntos
          </p>
          <p className="text-xs text-muted-foreground">
            Comparte tu enlace. Cuando tu amigo reciba su primer envío, ambos
            ganan {bonus} puntos.
          </p>
        </div>
      </div>

      {/* Código / enlace */}
      <button
        type="button"
        onClick={copyCode}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2.5 text-left transition active:scale-[0.99]"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tu código
          </span>
          <span className="tabular text-base font-extrabold tracking-wider text-foreground">
            {code}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copiar enlace
            </>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={share}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
      >
        <Share2 className="h-4 w-4" /> Compartir invitación
      </button>

      {invited > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {invited} {invited === 1 ? "invitado" : "invitados"} · {rewarded}{" "}
          premiado{rewarded === 1 ? "" : "s"}
        </p>
      )}
    </Card>
  );
}
