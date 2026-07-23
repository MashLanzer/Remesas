"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, Button, Field, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { createPackage, togglePackage, deletePackage } from "@/app/actions";
import { DELIVERY_CURRENCIES, type RemittancePackage } from "@/lib/types";
import { usd } from "@/lib/utils";

export function PackagesManager({ packages }: { packages: RemittancePackage[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nuevo paquete
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo paquete">
        <form
          action={async (fd) => {
            await createPackage(fd);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <Field label="Título">
            <Input name="title" required placeholder="Ej: Paquete Ayuda $50" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto (USD)">
              <Input
                type="number"
                name="amount_usd"
                min="0"
                step="0.01"
                required
                placeholder="50.00"
              />
            </Field>
            <Field label="Moneda de entrega">
              <Select name="delivery_currency" defaultValue="CUP" title="Moneda">
                {DELIVERY_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Gancho (lo que recibe / bono)">
            <Input
              name="highlight"
              placeholder="Ej: Recibe 40 000 CUP · o + recarga $5"
            />
          </Field>
          <Field label="Emoji (opcional)">
            <Input name="emoji" placeholder="🎁" maxLength={4} />
          </Field>
          <Field label="Descripción">
            <Textarea name="description" rows={2} placeholder="Detalles del paquete…" />
          </Field>
          <Button type="submit" className="w-full">
            Publicar paquete
          </Button>
        </form>
      </Sheet>

      {packages.length === 0 ? (
        <EmptyState
          title="Sin paquetes"
          description="Crea paquetes de remesa listos para que tus clientes pidan con un toque."
        />
      ) : (
        <div className="space-y-2">
          {packages.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                {p.emoji || "🎁"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {p.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {usd(Number(p.amount_usd))}
                  {p.delivery_currency ? ` · ${p.delivery_currency}` : ""}
                  {p.highlight ? ` · ${p.highlight}` : ""}
                  {p.active ? "" : " · oculto"}
                </p>
              </div>
              <button
                onClick={() => start(() => togglePackage(p.id, !p.active))}
                disabled={pending}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition active:scale-90 disabled:opacity-50"
                aria-label={p.active ? "Ocultar" : "Mostrar"}
              >
                {p.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar "${p.title}"?`))
                    start(() => deletePackage(p.id));
                }}
                disabled={pending}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-destructive transition active:scale-90 disabled:opacity-50"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
