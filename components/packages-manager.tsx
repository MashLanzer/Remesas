"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, Button, Field, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { createPackage, togglePackage, deletePackage } from "@/app/actions";
import {
  DELIVERY_CURRENCIES,
  PACKAGE_TEMPLATES,
  type ExchangeRate,
  type RemittancePackage,
} from "@/lib/types";
import type { CommissionRules } from "@/lib/calc";
import { usd, localAmount, packageQuote } from "@/lib/utils";
import { useDialog } from "@/components/confirm";

type Draft = {
  title: string;
  amount_usd: string;
  delivery_currency: string;
  highlight: string;
  emoji: string;
  description: string;
};

const EMPTY: Draft = {
  title: "",
  amount_usd: "",
  delivery_currency: "CUP",
  highlight: "",
  emoji: "",
  description: "",
};

export function PackagesManager({
  packages,
  rates,
  rules,
}: {
  packages: RemittancePackage[];
  rates: ExchangeRate[];
  rules?: CommissionRules;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const { confirm } = useDialog();

  const quote = packageQuote(
    parseFloat(draft.amount_usd) || 0,
    draft.delivery_currency,
    rates,
    rules
  );

  function openBlank() {
    setDraft(EMPTY);
    setOpen(true);
  }

  function openTemplate(t: (typeof PACKAGE_TEMPLATES)[number]) {
    setDraft({
      title: t.title,
      amount_usd: String(t.amount_usd),
      delivery_currency: t.delivery_currency,
      highlight: t.highlight,
      emoji: t.emoji,
      description: t.description,
    });
    setOpen(true);
  }

  const set = (k: keyof Draft) => (v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={openBlank}>
        <Plus className="h-4 w-4" /> Nuevo paquete
      </Button>

      {/* Plantillas para empezar rápido */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Empezar con una plantilla
        </p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {PACKAGE_TEMPLATES.map((t) => (
            <button
              key={t.title}
              onClick={() => openTemplate(t)}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition active:scale-95"
            >
              <span className="text-base">{t.emoji}</span>
              {t.title}
              <span className="text-xs font-semibold text-primary">
                ${t.amount_usd}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo paquete">
        <form
          action={async (fd) => {
            await createPackage(fd);
            setOpen(false);
          }}
          className="space-y-3"
        >
          <Field label="Título">
            <Input
              name="title"
              required
              placeholder="Ej: Paquete Ayuda $50"
              value={draft.title}
              onChange={(e) => set("title")(e.target.value)}
            />
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
                value={draft.amount_usd}
                onChange={(e) => set("amount_usd")(e.target.value)}
              />
            </Field>
            <Field label="Moneda de entrega">
              <Select
                name="delivery_currency"
                value={draft.delivery_currency}
                onChange={(e) => set("delivery_currency")(e.target.value)}
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

          {/* Vista previa en vivo: qué PAGA el cliente y qué RECIBE la familia,
              con la comisión ya descontada. El "recibe" se calcula con la tasa
              actual y se reacomoda solo cuando cambie la tasa (no se guarda un
              número fijo viejo). */}
          <div className="rounded-xl bg-muted p-3">
            <div className="flex items-stretch gap-2">
              <div className="flex-1 rounded-lg bg-card px-3 py-2 text-center">
                <p className="text-[11px] text-muted-foreground">Cliente paga</p>
                <p className="text-base font-bold text-foreground">
                  {usd(quote.pays)}
                </p>
              </div>
              <div className="flex items-center text-muted-foreground">→</div>
              <div className="flex-1 rounded-lg bg-card px-3 py-2 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Familia recibe
                </p>
                {quote.receives != null ? (
                  <p className="text-base font-bold text-income">
                    {draft.delivery_currency === "USD"
                      ? usd(quote.receives)
                      : `~${localAmount(quote.receives)} ${draft.delivery_currency}`}
                  </p>
                ) : (
                  <p className="text-xs font-medium text-muted-foreground">
                    Falta tasa de {draft.delivery_currency}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              {quote.commission > 0
                ? `Comisión ${usd(quote.commission)} ya descontada · `
                : ""}
              {draft.delivery_currency === "USD"
                ? "entrega directa en USD."
                : "se ajusta solo cuando cambie la tasa."}
            </p>
          </div>

          <Field label="Etiqueta / promo (opcional)">
            <Input
              name="highlight"
              placeholder="Ej: 🔥 Tasa especial · Sin comisión · + recarga $5"
              value={draft.highlight}
              onChange={(e) => set("highlight")(e.target.value)}
            />
          </Field>
          <Field label="Emoji (opcional)">
            <Input
              name="emoji"
              placeholder="🎁"
              maxLength={4}
              value={draft.emoji}
              onChange={(e) => set("emoji")(e.target.value)}
            />
          </Field>
          <Field label="Descripción">
            <Textarea
              name="description"
              rows={2}
              placeholder="Detalles del paquete…"
              value={draft.description}
              onChange={(e) => set("description")(e.target.value)}
            />
          </Field>
          <Button type="submit" className="w-full">
            Publicar paquete
          </Button>
        </form>
      </Sheet>

      {packages.length === 0 ? (
        <EmptyState
          title="Sin paquetes"
          description="Toca una plantilla de arriba o crea el tuyo desde cero."
        />
      ) : (
        <div className="space-y-2">
          {packages.map((p) => {
            const receives = packageQuote(
              p.amount_usd,
              p.delivery_currency,
              rates,
              rules
            ).receives;
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
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Eliminar paquete",
                        message: `¿Eliminar "${p.title}"?`,
                        confirmLabel: "Eliminar",
                      })
                    )
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
