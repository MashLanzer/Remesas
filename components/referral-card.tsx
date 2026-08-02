"use client";

import { useState, useTransition } from "react";
import {
  Gift,
  Share2,
  Copy,
  Check,
  Users,
  ChevronDown,
  Trophy,
  Clock,
  UserPlus,
} from "lucide-react";
import { Card } from "@/components/ui";
import { listMyReferrals, type ReferralFriend } from "@/app/actions";

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
  // Seguimiento: lista de amigos cargada bajo demanda al desplegar.
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<ReferralFriend[] | null>(null);
  const [loading, start] = useTransition();

  function toggleList() {
    const next = !open;
    setOpen(next);
    if (next && friends === null) {
      start(async () => setFriends(await listMyReferrals()));
    }
  }

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
        <div className="rounded-xl border border-border">
          <button
            type="button"
            onClick={toggleList}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-medium text-muted-foreground transition active:scale-[0.99]"
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            {invited} {invited === 1 ? "invitado" : "invitados"} · {rewarded}{" "}
            premiado{rewarded === 1 ? "" : "s"}
            <ChevronDown
              className={
                "ml-auto h-4 w-4 shrink-0 transition-transform " +
                (open ? "rotate-180" : "")
              }
            />
          </button>

          {open && (
            <div className="border-t border-border px-3 py-2">
              {loading && friends === null ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  Cargando…
                </p>
              ) : friends && friends.length > 0 ? (
                <ul className="space-y-1.5">
                  {friends.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 py-0.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground">
                        {f.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {f.name}
                      </span>
                      <ReferralStatusBadge status={f.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  Aún no podemos mostrar el detalle.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// Etiqueta de estado de un amigo referido.
function ReferralStatusBadge({ status }: { status: ReferralFriend["status"] }) {
  const meta =
    status === "premiado"
      ? {
          icon: Trophy,
          label: "Premiado",
          cls: "bg-income/10 text-income",
        }
      : status === "activo"
      ? {
          icon: Clock,
          label: "En camino",
          cls: "bg-primary/10 text-primary",
        }
      : {
          icon: UserPlus,
          label: "Registrado",
          cls: "bg-muted text-muted-foreground",
        };
  const Icon = meta.icon;
  return (
    <span
      className={
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
        meta.cls
      }
    >
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}
