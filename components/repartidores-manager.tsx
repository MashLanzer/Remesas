"use client";

import { useState, useTransition } from "react";
import {
  Truck,
  Check,
  X,
  Copy,
  Share2,
  RefreshCw,
  UserMinus,
} from "lucide-react";
import { Card } from "@/components/ui";
import { approveMember, removeMember, regenerateCode } from "@/app/actions";
import type { Profile } from "@/lib/types";
import { useDialog } from "@/components/confirm";

export function TeamManager({
  code,
  pending,
  members,
}: {
  code: string | null;
  pending: Profile[];
  members: Profile[];
}) {
  const [pendingTx, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const { confirm } = useDialog();

  function copy() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  async function share() {
    const text = `Únete a mi equipo en Giro con el código: ${code}`;
    try {
      if (navigator.share) return await navigator.share({ text });
    } catch {
      /* cancelado */
    }
    copy();
  }

  return (
    <div className="space-y-5">
      {/* Código de equipo */}
      <Card className="space-y-3">
        <p className="text-sm font-bold text-foreground">Código de tu equipo</p>
        <div className="flex items-center justify-center rounded-2xl bg-muted py-4">
          <span className="tabular text-3xl font-extrabold tracking-[0.35em] text-foreground">
            {code ?? "——————"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Compártelo con tus repartidores para que se unan a ti. Cada uno queda
          pendiente hasta que lo aceptes.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={copy}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-semibold text-foreground transition active:scale-95"
          >
            <Copy className="h-4 w-4" /> {copied ? "¡Copiado!" : "Copiar"}
          </button>
          <button
            onClick={share}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-semibold text-foreground transition active:scale-95"
          >
            <Share2 className="h-4 w-4" /> Compartir
          </button>
          <button
            onClick={async () => {
              if (
                await confirm({
                  title: "Regenerar código",
                  message: "¿Regenerar el código? El anterior dejará de servir.",
                  confirmLabel: "Regenerar",
                })
              )
                start(() => regenerateCode());
            }}
            disabled={pendingTx}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-semibold text-muted-foreground transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" /> Nuevo
          </button>
        </div>
      </Card>

      {/* Pendientes */}
      {pending.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Solicitudes pendientes ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((p) => (
              <Card key={p.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                    <Truck className="h-5 w-5" />
                  </span>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {p.full_name || "Sin nombre"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => start(() => approveMember(p.id))}
                    disabled={pendingTx}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition active:scale-90 disabled:opacity-50"
                    aria-label="Aceptar"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        await confirm({
                          message: `¿Rechazar la solicitud de ${p.full_name || "este repartidor"}? Tendría que volver a pedir unirse.`,
                          confirmLabel: "Quitar",
                        })
                      )
                        start(() => removeMember(p.id));
                    }}
                    disabled={pendingTx}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition active:scale-90 disabled:opacity-50"
                    aria-label="Rechazar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Repartidores activos */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Repartidores ({members.length})
        </h2>
        {members.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              Aún no tienes repartidores. Comparte tu código para que se unan.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {members.map((p) => (
              <Card key={p.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                    <Truck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {p.full_name || "Sin nombre"}
                    </p>
                    {p.phone && (
                      <p className="truncate text-xs text-muted-foreground">
                        {p.phone}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (
                      await confirm({
                        message: `¿Quitar a ${p.full_name || "este repartidor"}? Sus remesas se quedan contigo.`,
                        confirmLabel: "Quitar",
                      })
                    )
                      start(() => removeMember(p.id));
                  }}
                  disabled={pendingTx}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive transition active:scale-95 disabled:opacity-50"
                >
                  <UserMinus className="h-4 w-4" /> Quitar
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
