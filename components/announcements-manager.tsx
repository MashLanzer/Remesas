"use client";

import { useState, useTransition } from "react";
import { Megaphone, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui";
import {
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
} from "@/app/actions";
import { useDialog } from "@/components/confirm";
import type { Announcement } from "@/lib/types";

export function AnnouncementsManager({ items }: { items: Announcement[] }) {
  const { confirm } = useDialog();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  async function remove(id: string) {
    const ok = await confirm({
      title: "Borrar anuncio",
      message: "¿Quitar este anuncio? Los clientes dejarán de verlo.",
      confirmLabel: "Borrar",
    });
    if (ok) start(() => deleteAnnouncement(id));
  }

  return (
    <div className="space-y-2">
      {/* Nuevo anuncio */}
      {open ? (
        <Card className="p-4">
          <form
            action={async (fd) => {
              await createAnnouncement(fd);
              setOpen(false);
            }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <input
                name="emoji"
                maxLength={2}
                placeholder="📣"
                className="w-14 rounded-xl border border-input bg-background px-3 py-2 text-center text-lg outline-none"
              />
              <input
                name="title"
                required
                placeholder="Título del anuncio"
                className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium text-foreground outline-none"
              />
            </div>
            <textarea
              name="body"
              rows={2}
              placeholder="Detalle (opcional): nueva promo, cambio de horario…"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground transition active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-[1.4] rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
              >
                Publicar
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card py-3 text-sm font-semibold text-primary transition active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Nuevo anuncio
        </button>
      )}

      {/* Lista */}
      {items.map((a) => (
        <Card
          key={a.id}
          className={
            "flex items-start gap-3 p-3.5 " + (a.active ? "" : "opacity-60")
          }
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg text-primary">
            {a.emoji || <Megaphone className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{a.title}</p>
            {a.body && (
              <p className="truncate text-xs text-muted-foreground">{a.body}</p>
            )}
            {!a.active && (
              <p className="mt-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                Oculto
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => start(() => toggleAnnouncement(a.id, !a.active))}
              disabled={pending}
              aria-label={a.active ? "Ocultar" : "Mostrar"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-90 disabled:opacity-50"
            >
              {a.active ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => remove(a.id)}
              disabled={pending}
              aria-label="Borrar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-destructive transition hover:bg-destructive/10 active:scale-90 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
