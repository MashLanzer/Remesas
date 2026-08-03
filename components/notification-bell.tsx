"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Package, XCircle, BellOff, Users } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { markNotificationsSeen } from "@/app/actions";
import type { AppNotification } from "@/lib/data";

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
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
  });
}

function Icon({ kind }: { kind: AppNotification["kind"] }) {
  if (kind === "delivered")
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-income/10 text-income">
        <CheckCircle2 className="h-5 w-5" />
      </span>
    );
  if (kind === "rejected")
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <XCircle className="h-5 w-5" />
      </span>
    );
  if (kind === "vaquita")
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Users className="h-5 w-5" />
      </span>
    );
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Package className="h-5 w-5" />
    </span>
  );
}

export function NotificationBell({
  items,
  unread,
}: {
  items: AppNotification[];
  unread: number;
}) {
  const [open, setOpen] = useState(false);
  const [dot, setDot] = useState(unread);

  async function openSheet() {
    setOpen(true);
    if (dot > 0) {
      setDot(0);
      try {
        await markNotificationsSeen();
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
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BellOff className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-foreground">
              Sin novedades por ahora
            </p>
            <p className="text-xs text-muted-foreground">
              Aquí te avisaremos cuando tu envío avance o se entregue.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.url}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 transition active:scale-[0.99]"
              >
                <Icon kind={n.kind} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {n.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {ago(n.at)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {n.body}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
