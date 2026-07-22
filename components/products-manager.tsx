"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, Button, Field, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { createProduct, toggleProduct, deleteProduct } from "@/app/actions";
import { PRODUCT_CATEGORIES, type Product } from "@/lib/types";
import { usd } from "@/lib/utils";

export function ProductsManager({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nuevo producto
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo producto">
        <form
          action={async (fd) => {
            await createProduct(fd);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <Field label="Nombre">
            <Input name="name" required placeholder="Ej: Recarga Cubacel 500 CUP" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio (USD)">
              <Input
                type="number"
                name="price_usd"
                min="0"
                step="0.01"
                required
                placeholder="5.00"
              />
            </Field>
            <Field label="Categoría">
              <Select name="category" defaultValue="recarga" title="Categoría">
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Emoji (opcional)">
            <Input name="emoji" placeholder="📱" maxLength={4} />
          </Field>
          <Field label="Descripción">
            <Textarea name="description" rows={2} placeholder="Detalles del producto…" />
          </Field>
          <Button type="submit" className="w-full">
            Publicar producto
          </Button>
        </form>
      </Sheet>

      {products.length === 0 ? (
        <EmptyState
          title="Sin productos"
          description="Publica combos, recargas y más para tus clientes."
        />
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const cat = PRODUCT_CATEGORIES.find((x) => x.key === p.category);
            return (
              <Card key={p.id} className="flex items-center gap-3 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                  {p.emoji || cat?.emoji || "🛍️"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {p.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {usd(Number(p.price_usd))}
                    {cat ? ` · ${cat.label}` : ""}
                    {p.active ? "" : " · oculto"}
                  </p>
                </div>
                <button
                  onClick={() => start(() => toggleProduct(p.id, !p.active))}
                  disabled={pending}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition active:scale-90 disabled:opacity-50"
                  aria-label={p.active ? "Ocultar" : "Mostrar"}
                >
                  {p.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${p.name}"?`))
                      start(() => deleteProduct(p.id));
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
