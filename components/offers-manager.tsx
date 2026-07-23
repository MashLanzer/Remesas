"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, Button, Field, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { createOffer, toggleOffer, deleteOffer } from "@/app/actions";
import { OFFER_KINDS, OFFER_TEMPLATES, type Offer } from "@/lib/types";
import { useDialog } from "@/components/confirm";

type Draft = {
  title: string;
  kind: string;
  description: string;
  emoji: string;
};

const EMPTY: Draft = { title: "", kind: "tasa", description: "", emoji: "" };

export function OffersManager({ offers }: { offers: Offer[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const { confirm } = useDialog();

  function openBlank() {
    setDraft(EMPTY);
    setOpen(true);
  }

  function openTemplate(t: (typeof OFFER_TEMPLATES)[number]) {
    setDraft({
      title: t.title,
      kind: t.kind,
      description: t.description,
      emoji: t.emoji,
    });
    setOpen(true);
  }

  const set = (k: keyof Draft) => (v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={openBlank}>
        <Plus className="h-4 w-4" /> Nueva promoción
      </Button>

      {/* Plantillas para empezar rápido */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Empezar con una plantilla
        </p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {OFFER_TEMPLATES.map((t) => (
            <button
              key={t.title}
              onClick={() => openTemplate(t)}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition active:scale-95"
            >
              <span className="text-base">{t.emoji}</span>
              {t.title}
            </button>
          ))}
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nueva promoción">
        <form
          action={async (fd) => {
            await createOffer(fd);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="emoji" value={draft.emoji} />
          <Field label="Título">
            <Input
              name="title"
              required
              placeholder="Ej: Hoy CUP 450 especial"
              value={draft.title}
              onChange={(e) => set("title")(e.target.value)}
            />
          </Field>
          <Field label="Tipo">
            <Select
              name="kind"
              value={draft.kind}
              onChange={(e) => set("kind")(e.target.value)}
              title="Tipo de promoción"
            >
              {OFFER_KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.emoji} {k.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descripción">
            <Textarea
              name="description"
              rows={2}
              placeholder="Detalles de la promoción…"
              value={draft.description}
              onChange={(e) => set("description")(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde (opcional)">
              <Input type="date" name="starts_at" />
            </Field>
            <Field label="Hasta (opcional)">
              <Input type="date" name="ends_at" />
            </Field>
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
            Un anuncio con foto llama más la atención del cliente.
          </p>
          <Button type="submit" className="w-full">
            Publicar promoción
          </Button>
        </form>
      </Sheet>

      {offers.length === 0 ? (
        <EmptyState
          title="Sin promociones"
          description="Toca una plantilla de arriba o crea la tuya desde cero."
        />
      ) : (
        <div className="space-y-2">
          {offers.map((o) => {
            const k = OFFER_KINDS.find((x) => x.key === o.kind);
            return (
              <Card key={o.id} className="flex items-center gap-3 p-3.5">
                {o.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={o.image_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                    {o.emoji || k?.emoji || "📣"}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {o.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.active ? "Visible" : "Oculta"}
                    {k ? ` · ${k.label}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => start(() => toggleOffer(o.id, !o.active))}
                  disabled={pending}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition active:scale-90 disabled:opacity-50"
                  aria-label={o.active ? "Ocultar" : "Mostrar"}
                >
                  {o.active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Eliminar promoción",
                        message: `¿Eliminar la promoción "${o.title}"?`,
                        confirmLabel: "Eliminar",
                      })
                    )
                      start(() => deleteOffer(o.id));
                  }}
                  disabled={pending}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-destructive transition active:scale-90 disabled:opacity-50"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
