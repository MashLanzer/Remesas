"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, Button, Field, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { createPackage, togglePackage, deletePackage } from "@/app/actions";
import {
  DELIVERY_CURRENCIES,
  type ExchangeRate,
  type RemittancePackage,
} from "@/lib/types";
import { usd, localAmount, packageReceives } from "@/lib/utils";

export function PackagesManager({
  packages,
  rates,
}: {
  packages: RemittancePackage[];
  rates: ExchangeRate[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  // Monto y moneda controlados para mostrar la vista previa en vivo del "recibe".
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>("CUP");
  const preview = packageReceives(parseFloat(amount) || 0, currency, rates);

  return (
    <div className="space-y-4">
      <Button
        className="w-full"
        onClick={() => {
          setAmount("");
          setCurrency("CUP");
          setOpen(true);
        }}
      >
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Moneda de entrega">
              <Select
                name="delivery_currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                title="Moneda"
              >
                {DELIVERY_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Vista previa en vivo: el "recibe" se calcula con la tasa actual y se
              reacomoda solo cuando cambies la tasa. No se guarda un número fijo. */}
          <div className="rounded-xl bg-muted p-3 text-center">
            {preview != null && currency !== "USD" ? (
              <>
                <p className="text-xs text-muted-foreground">
                  A la tasa de hoy, tu cliente recibe
                </p>
                <p className="text-lg font-bold text-income">
                  ~{localAmount(preview)} {currency}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Se ajusta automáticamente cuando cambie la tasa.
                </p>
              </>
            ) : currency === "USD" ? (
              <p className="text-xs text-muted-foreground">
                Entrega en USD: recibe el mismo monto.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Configura la tasa de {currency} para ver cuánto recibe.
              </p>
            )}
          </div>

          <Field label="Etiqueta / promo (opcional)">
            <Input
              name="highlight"
              placeholder="Ej: 🔥 Tasa especial · Sin comisión · + recarga $5"
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
          {packages.map((p) => {
            const receives = packageReceives(
              p.amount_usd,
              p.delivery_currency,
              rates
            );
            return (
              <Card key={p.id} className="flex items-center gap-3 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                  {p.emoji || "🎁"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {p.title}
                    {p.highlight ? (
                      <span className="ml-1.5 text-xs font-medium text-primary">
                        {p.highlight}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {usd(Number(p.amount_usd))}
                    {receives != null && p.delivery_currency !== "USD"
                      ? ` · recibe ~${localAmount(receives)} ${p.delivery_currency}`
                      : p.delivery_currency
                      ? ` · ${p.delivery_currency}`
                      : ""}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
