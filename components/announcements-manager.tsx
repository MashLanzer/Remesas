"use client";

import { useState, useTransition } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  Users,
  Truck,
} from "lucide-react";
import { Card, Button, Field, Input, Textarea, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import {
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
} from "@/app/actions";
import { useDialog } from "@/components/confirm";
import type { Announcement, AnnouncementAudience } from "@/lib/types";

const AUDIENCES: { key: AnnouncementAudience; label: string }[] = [
  { key: "clientes", label: "Clientes" },
  { key: "repartidores", label: "Repartidores" },
  { key: "ambos", label: "Ambos" },
];

function audienceLabel(a: AnnouncementAudience) {
  return a === "repartidores"
    ? "Repartidores"
    : a === "ambos"
    ? "Clientes y repartidores"
    : "Clientes";
}

type Draft = {
  id?: string;
  title: string;
  body: string;
  emoji: string;
  audience: AnnouncementAudience;
  imageUrl?: string | null;
};

const EMPTY: Draft = {
  title: "",
  body: "",
  emoji: "",
  audience: "clientes",
};

export function AnnouncementsManager({ items }: { items: Announcement[] }) {
  const { confirm } = useDialog();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [preview, setPreview] = useState<Announcement | null>(null);
  const [pending, start] = useTransition();

  function openBlank() {
    setDraft(EMPTY);
    setOpen(true);
  }
  function openEdit(a: Announcement) {
    setDraft({
      id: a.id,
      title: a.title,
      body: a.body || "",
      emoji: a.emoji || "",
      audience: (a.audience as AnnouncementAudience) || "clientes",
      imageUrl: a.image_url,
    });
    setOpen(true);
  }
  const set = (k: keyof Draft) => (v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  async function remove(a: Announcement) {
    const ok = await confirm({
      title: "Borrar anuncio",
      message: `¿Quitar "${a.title}"? Dejará de verse.`,
      confirmLabel: "Borrar",
    });
    if (ok) start(() => deleteAnnouncement(a.id));
  }

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={openBlank}>
        <Plus className="h-4 w-4" /> Nuevo anuncio
      </Button>

      {/* Crear / editar */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "Editar anuncio" : "Nuevo anuncio"}
      >
        <form
          action={async (fd) => {
            await createAnnouncement(fd);
            setOpen(false);
            setDraft(EMPTY);
          }}
          className="space-y-3"
        >
          {draft.id && <input type="hidden" name="id" value={draft.id} />}
          <div className="flex gap-2">
            <input
              name="emoji"
              maxLength={2}
              placeholder="📣"
              value={draft.emoji}
              onChange={(e) => set("emoji")(e.target.value)}
              className="w-14 rounded-xl border border-input bg-background px-3 py-2 text-center text-lg outline-none"
            />
            <input
              name="title"
              required
              placeholder="Título del anuncio"
              value={draft.title}
              onChange={(e) => set("title")(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium text-foreground outline-none"
            />
          </div>
          <Textarea
            name="body"
            rows={2}
            placeholder="Detalle (opcional): nueva promo, cambio de horario…"
            value={draft.body}
            onChange={(e) => set("body")(e.target.value)}
          />

          {/* ¿Para quién? */}
          <input type="hidden" name="audience" value={draft.audience} />
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              ¿Para quién?
            </p>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1">
              {AUDIENCES.map((a) => {
                const on = a.key === draft.audience;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, audience: a.key }))}
                    className={
                      "rounded-lg py-1.5 text-xs font-semibold transition " +
                      (on
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground")
                    }
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Imagen (opcional)">
            <input
              type="file"
              name="image"
              accept="image/*"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </Field>
          <p className="-mt-1 text-[11px] text-muted-foreground">
            {draft.imageUrl
              ? "Ya tiene imagen. Sube una nueva solo si quieres cambiarla."
              : "Un anuncio con foto llama más la atención."}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground transition active:scale-[0.98]"
            >
              Cancelar
            </button>
            <Button type="submit" className="flex-[1.4]">
              {draft.id ? "Guardar cambios" : "Publicar"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Lista */}
      {items.length === 0 ? (
        <EmptyState
          title="Sin anuncios"
          description="Crea un aviso para que tus clientes o repartidores lo vean en su inicio."
        />
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const aud = (a.audience as AnnouncementAudience) || "clientes";
            return (
              <Card
                key={a.id}
                className={"space-y-2.5 p-3.5 " + (a.active ? "" : "opacity-60")}
              >
                <div className="flex items-center gap-3">
                  {a.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.image_url}
                      alt={a.title}
                      className="h-10 w-10 shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg text-primary">
                      {a.emoji || <Megaphone className="h-5 w-5" />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {a.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {aud === "repartidores" ? (
                          <Truck className="h-3 w-3" />
                        ) : (
                          <Users className="h-3 w-3" />
                        )}
                        {audienceLabel(aud)}
                      </span>
                      {!a.active && (
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          Oculto
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                  <MiniAction
                    icon={Eye}
                    label="Vista previa"
                    onClick={() => setPreview(a)}
                  />
                  <MiniAction
                    icon={Pencil}
                    label="Editar"
                    onClick={() => openEdit(a)}
                  />
                  <MiniAction
                    icon={a.active ? EyeOff : Eye}
                    label={a.active ? "Ocultar" : "Mostrar"}
                    onClick={() => start(() => toggleAnnouncement(a.id, !a.active))}
                    disabled={pending}
                  />
                  <MiniAction
                    icon={Trash2}
                    label="Borrar"
                    tone="destructive"
                    onClick={() => remove(a)}
                    disabled={pending}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vista previa */}
      <Sheet
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Vista previa"
      >
        {preview && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Así se ve en el inicio de{" "}
              {audienceLabel(
                (preview.audience as AnnouncementAudience) || "clientes"
              ).toLowerCase()}
              .
            </p>
            <div className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/5">
              {preview.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.image_url}
                  alt={preview.title}
                  className="h-40 w-full object-cover"
                />
              )}
              <div className="flex items-start gap-3 p-4">
                {!preview.image_url && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg text-primary">
                    {preview.emoji || <Megaphone className="h-5 w-5" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">
                    {preview.title}
                  </p>
                  {preview.body && (
                    <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">
                      {preview.body}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}

function MiniAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "destructive";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-50 " +
        (tone === "destructive" ? "text-destructive" : "text-foreground")
      }
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
