"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, Button, Field, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { createOffer, toggleOffer, deleteOffer } from "@/app/actions";
import { OFFER_KINDS, type Offer } from "@/lib/types";

export function OffersManager({ offers }: { offers: Offer[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nueva oferta
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nueva oferta">
        <form
          action={async (fd) => {
            await createOffer(fd);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <Field label="Título">
            <Input name="title" required placeholder="Ej: Hoy CUP 450 especial" />
          </Field>
          <Field label="Tipo">
            <Select name="kind" defaultValue="tasa" title="Tipo de oferta">
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
              placeholder="Detalles de la oferta…"
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
          <Button type="submit" className="w-full">
            Publicar oferta
          </Button>
        </form>
      </Sheet>

      {offers.length === 0 ? (
        <EmptyState
          title="Sin ofertas"
          description="Publica promociones o tasas especiales para tus clientes."
        />
      ) : (
        <div className="space-y-2">
          {offers.map((o) => {
            const k = OFFER_KINDS.find((x) => x.key === o.kind);
            return (
              <Card key={o.id} className="flex items-center gap-3 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                  {o.emoji || k?.emoji || "📣"}
                </span>
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
                  onClick={() => {
                    if (confirm(`¿Eliminar la oferta "${o.title}"?`))
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
