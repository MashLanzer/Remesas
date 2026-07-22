"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Card, Button, Field, Input, Textarea, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { createStoreOrder } from "@/app/actions";
import { usd } from "@/lib/utils";
import { PRODUCT_CATEGORIES, type Product } from "@/lib/types";

export function StoreView({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);

  function open(p: Product) {
    setSelected(p);
    setQty(1);
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="Tienda vacía"
        description="Cuando el negocio publique combos o recargas, aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-5">
      {PRODUCT_CATEGORIES.map((cat) => {
        const items = products.filter(
          (p) => (p.category ?? "otro") === cat.key
        );
        if (items.length === 0) return null;
        return (
          <section key={cat.key}>
            <h2 className="mb-2 text-sm font-bold text-foreground">
              {cat.emoji} {cat.label}
            </h2>
            <div className="space-y-2">
              {items.map((p) => (
                <Card key={p.id} className="flex items-center gap-3 p-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                    {p.emoji || cat.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabular text-sm font-bold text-foreground">
                      {usd(Number(p.price_usd))}
                    </span>
                    <button
                      onClick={() => open(p)}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition active:scale-95"
                    >
                      Pedir
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
      >
        {selected && (
          <form
            action={async (fd) => {
              await createStoreOrder(fd);
              setSelected(null);
            }}
            className="space-y-3"
          >
            <input type="hidden" name="product_id" value={selected.id} />

            <div className="flex items-center justify-between rounded-xl bg-muted p-3">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShoppingBag className="h-4 w-4 text-primary" />
                {selected.name}
              </span>
              <span className="tabular text-sm font-bold text-foreground">
                {usd(Number(selected.price_usd) * qty)}
              </span>
            </div>

            <Field label="Cantidad">
              <Input
                type="number"
                name="qty"
                min="1"
                step="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              />
            </Field>

            <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ¿Para quién en Cuba?
            </p>
            <Field label="Nombre">
              <Input name="recipient_name" placeholder="Quién recibe" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono">
                <Input name="recipient_phone" inputMode="tel" placeholder="+53…" />
              </Field>
              <Field label="Provincia / zona">
                <Input name="address" placeholder="Dirección o zona" />
              </Field>
            </div>
            <Field label="Nota (opcional)">
              <Textarea name="note" rows={2} placeholder="Detalles del pedido…" />
            </Field>

            <Button type="submit" className="w-full">
              Pedir por {usd(Number(selected.price_usd) * qty)}
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
