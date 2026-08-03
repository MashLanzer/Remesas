"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Package,
  XCircle,
  Users,
  Truck,
  Wallet,
  Star,
  MessageSquare,
  Megaphone,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { markAllNotificationsRead } from "@/app/actions";
import type { StoredNotification } from "@/lib/data";

function ago(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString("es", { day: "2-digit", month: "short" });
}

// Icono + color según el tipo de notificación.
function meta(type: string): { Icon: LucideIcon; cls: string } {
  if (type.startsWith("remesa_entregada") || type.endsWith("_confirmado") || type.endsWith("_aceptado"))
    return { Icon: CheckCircle2, cls: "bg-income/10 text-income" };
  if (type.includes("rechaz") || type.includes("cancel") || type.includes("incidencia"))
    return { Icon: XCircle, cls: "bg-destructive/10 text-destructive" };
  if (type.startsWith("vaquita")) return { Icon: Users, cls: "bg-primary/10 text-primary" };
  if (type.startsWith("reparto") || type.startsWith("equipo") || type.startsWith("en_camino"))
    return { Icon: Truck, cls: "bg-primary/10 text-primary" };
  if (type.startsWith("pago") || type.startsWith("cobro"))
    return { Icon: Wallet, cls: "bg-income/10 text-income" };
  if (type.startsWith("reseña") || type.startsWith("resena") || type.startsWith("puntos") || type.startsWith("referido"))
    return { Icon: Star, cls: "bg-primary/10 text-primary" };
  if (type === "chat") return { Icon: MessageSquare, cls: "bg-primary/10 text-primary" };
  if (type.startsWith("anuncio")) return { Icon: Megaphone, cls: "bg-primary/10 text-primary" };
  if (type.startsWith("pedido")) return { Icon: Package, cls: "bg-primary/10 text-primary" };
  return { Icon: Bell, cls: "bg-muted text-muted-foreground" };
}

export function NotificationBell({
  items,
  unread,
  alertsHref,
  alertsCount = 0,
}: {
  items: StoredNotification[];
  unread: number;
  // Enlace opcional a las "alertas del negocio" (pendientes, saldo, tasas) del
  // operador/repartidor.
  alertsHref?: string;
  alertsCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dot, setDot] = useState(unread + alertsCount);

  async function openSheet() {
    setOpen(true);
    if (unread > 0) {
      setDot(alertsCount);
      try {
        await markAllNotificationsRead();
        router.refresh();
      } catch {
        /* tolerante */
      }
    }
  }

  return (
    <>
      <button
        onClick={openSheet}
        aria-label="Notificaciones"
        title="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-muted"
      >
        <Bell className="h-5 w-5" />
        {dot > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-white">
            {dot > 9 ? "9+" : dot}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Notificaciones">
        {alertsHref && (
          <Link
            href={alertsHref}
            onClick={() => setOpen(false)}
            className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-border bg-muted/40 p-3 transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bell className="h-4 w-4 text-primary" /> Alertas del negocio
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {alertsCount > 0 && (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                  {alertsCount}
                </span>
              )}
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BellOff className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-foreground">
              Sin novedades por ahora
            </p>
            <p className="text-xs text-muted-foreground">
              Aquí te avisaremos de cada movimiento.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const { Icon, cls } = meta(n.type);
              const inner = (
                <>
                  <span
                    className={
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                      cls
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {ago(n.created_at)}
                      </span>
                    </div>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                  </div>
                </>
              );
              const base =
                "flex items-start gap-3 rounded-2xl border p-3 transition active:scale-[0.99] " +
                (n.read_at
                  ? "border-border bg-card"
                  : "border-primary/30 bg-primary/5");
              return n.url ? (
                <Link
                  key={n.id}
                  href={n.url}
                  onClick={() => setOpen(false)}
                  className={base}
                >
                  {inner}
                </Link>
              ) : (
                <div key={n.id} className={base}>
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </Sheet>
    </>
  );
}
