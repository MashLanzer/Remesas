"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  Copy,
  Share2,
  Send,
  Search,
  ImageIcon,
  ArrowLeft,
  Download,
} from "lucide-react";
import { Card, Button, Field, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { PaperPlane } from "@/components/paper-plane";
import { shareNodeAsImage } from "@/lib/share-image";
import {
  createPackage,
  updatePackage,
  togglePackage,
  deletePackage,
} from "@/app/actions";
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
  id?: string;
  title: string;
  amount_usd: string;
  delivery_currency: string;
  highlight: string;
  emoji: string;
  description: string;
  imageUrl?: string | null;
  // Precio fijo (0054).
  pricing_mode: "auto" | "fixed";
  fixed_send_usd: string;
  fixed_receives: string;
};

type ClientLite = { name: string; phone: string };

const EMPTY: Draft = {
  title: "",
  amount_usd: "",
  delivery_currency: "CUP",
  highlight: "",
  emoji: "",
  description: "",
  pricing_mode: "auto",
  fixed_send_usd: "",
  fixed_receives: "",
};

export function PackagesManager({
  packages,
  rates,
  rules,
  brand = "Giro",
  clients = [],
}: {
  packages: RemittancePackage[];
  rates: ExchangeRate[];
  rules?: CommissionRules;
  brand?: string;
  clients?: ClientLite[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [preview, setPreview] = useState<RemittancePackage | null>(null);
  const [sharing, setSharing] = useState<RemittancePackage | null>(null);
  const [sendingTo, setSendingTo] = useState<RemittancePackage | null>(null);
  const [clientQ, setClientQ] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { confirm, notify } = useDialog();

  const quote = packageQuote(
    parseFloat(draft.amount_usd) || 0,
    draft.delivery_currency,
    rates,
    rules,
    draft.pricing_mode === "fixed"
      ? {
          send_usd: parseFloat(draft.fixed_send_usd) || 0,
          receives: parseFloat(draft.fixed_receives) || 0,
        }
      : null
  );

  // Cálculo de lo que recibe la familia para un paquete guardado (preview/lista).
  function pkgQuote(p: RemittancePackage) {
    return packageQuote(
      p.amount_usd,
      p.delivery_currency,
      rates,
      rules,
      p.pricing_mode === "fixed"
        ? { send_usd: p.fixed_send_usd, receives: p.fixed_receives }
        : null
    );
  }

  // Texto para difundir / enviar por WhatsApp.
  function pkgText(p: RemittancePackage, name?: string): string {
    const q = pkgQuote(p);
    const recibe =
      q.receives != null
        ? p.delivery_currency === "USD"
          ? `Recibe ${usd(q.receives)}`
          : `Recibe ~${localAmount(q.receives)} ${p.delivery_currency}`
        : null;
    return [
      name ? `Hola ${name}!` : null,
      `${p.emoji || "🎁"} ${p.title}`,
      p.description || null,
      `Paga ${usd(Number(p.amount_usd))}${recibe ? " · " + recibe : ""}`,
      p.highlight || null,
      `— ${brand} ✈️`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  function openBlank() {
    setDraft(EMPTY);
    setOpen(true);
  }

  function openTemplate(t: (typeof PACKAGE_TEMPLATES)[number]) {
    setDraft({
      ...EMPTY,
      title: t.title,
      amount_usd: String(t.amount_usd),
      delivery_currency: t.delivery_currency,
      highlight: t.highlight,
      emoji: t.emoji,
      description: t.description,
    });
    setOpen(true);
  }

  function draftFrom(p: RemittancePackage): Draft {
    return {
      title: p.title,
      amount_usd: String(p.amount_usd ?? ""),
      delivery_currency: p.delivery_currency || "CUP",
      highlight: p.highlight || "",
      emoji: p.emoji || "",
      description: p.description || "",
      imageUrl: p.image_url,
      pricing_mode: p.pricing_mode === "fixed" ? "fixed" : "auto",
      fixed_send_usd: p.fixed_send_usd != null ? String(p.fixed_send_usd) : "",
      fixed_receives: p.fixed_receives != null ? String(p.fixed_receives) : "",
    };
  }
  function openEdit(p: RemittancePackage) {
    setDraft({ ...draftFrom(p), id: p.id });
    setOpen(true);
  }
  function openDuplicate(p: RemittancePackage) {
    // El duplicado no arrastra la foto: es un borrador nuevo sin imagen hasta
    // que el operador suba una (createPackage solo sube si hay archivo).
    setDraft({ ...draftFrom(p), title: `${p.title} (copia)`, imageUrl: null });
    setOpen(true);
  }

  const set = (k: keyof Draft) => (v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const isFixed = draft.pricing_mode === "fixed";

  function openShare(p: RemittancePackage) {
    setImgUrl(null);
    setSharing(p);
  }
  async function doSharePhoto() {
    const node = cardRef.current;
    if (!node) return;
    setBusy(true);
    try {
      const res = await shareNodeAsImage(node, {
        title: sharing?.title || "Paquete",
        fileName: `paquete-${Date.now()}.png`,
      });
      if (res.status === "fallback" && res.dataUrl) setImgUrl(res.dataUrl);
    } catch {
      /* nada */
    } finally {
      setBusy(false);
    }
  }
  async function doShareText() {
    const p = sharing;
    if (!p) return;
    const text = pkgText(p);
    try {
      if (navigator.share) {
        await navigator.share({ title: p.title, text });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      notify("Paquete copiado");
    } catch {
      /* nada */
    }
  }

  const filteredClients = useMemo(() => {
    const t = clientQ.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(t));
  }, [clients, clientQ]);

  const shareQuote = sharing ? pkgQuote(sharing) : null;

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

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "Editar paquete" : "Nuevo paquete"}
      >
        <form
          action={async (fd) => {
            if (draft.id) await updatePackage(fd);
            else await createPackage(fd);
            setOpen(false);
          }}
          className="space-y-3"
        >
          {draft.id && <input type="hidden" name="id" value={draft.id} />}
          <Field label="Título">
            <Input
              name="title"
              required
              placeholder="Ej: Paquete Ayuda $50"
              value={draft.title}
              onChange={(e) => set("title")(e.target.value)}
            />
          </Field>
          {/* Modo de precio: automático (cobra comisión) o fijo (tú pones los
              números y mandan, sin comisión aparte). */}
          <input type="hidden" name="pricing_mode" value={draft.pricing_mode} />
          <div className="grid grid-cols-2 gap-2">
            {(["auto", "fixed"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set("pricing_mode")(m)}
                className={
                  "rounded-xl border px-3 py-2 text-left transition " +
                  (draft.pricing_mode === m
                    ? "border-primary bg-primary/10"
                    : "border-border")
                }
              >
                <span className="block text-sm font-semibold text-foreground">
                  {m === "auto" ? "Automático" : "Precio fijo"}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {m === "auto" ? "Cobra comisión normal" : "Tú pones los números"}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={isFixed ? "Cliente paga (USD)" : "Monto (USD)"}>
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

          {isFixed && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Se envía (USD)" hint="Lo que realmente mandas.">
                <Input
                  type="number"
                  name="fixed_send_usd"
                  min="0"
                  step="0.01"
                  placeholder="95.00"
                  value={draft.fixed_send_usd}
                  onChange={(e) => set("fixed_send_usd")(e.target.value)}
                />
              </Field>
              <Field
                label={`Llega a la familia (${draft.delivery_currency})`}
                hint="El número exacto que ve el cliente."
              >
                <Input
                  type="number"
                  name="fixed_receives"
                  min="0"
                  step="0.01"
                  placeholder={draft.delivery_currency === "USD" ? "95.00" : "44500"}
                  value={draft.fixed_receives}
                  onChange={(e) => set("fixed_receives")(e.target.value)}
                />
              </Field>
            </div>
          )}

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
              {isFixed
                ? `Precio fijo · tu ganancia ${usd(quote.commission)} · no cambia con la tasa.`
                : `${
                    quote.commission > 0
                      ? `Comisión ${usd(quote.commission)} ya descontada · `
                      : ""
                  }${
                    draft.delivery_currency === "USD"
                      ? "entrega directa en USD."
                      : "se ajusta solo cuando cambie la tasa."
                  }`}
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
          <Field label="Foto (opcional)">
            <input
              type="file"
              name="image"
              accept="image/*"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </Field>
          <p className="-mt-1 text-[11px] text-muted-foreground">
            {draft.imageUrl
              ? "Ya tiene foto. Sube una nueva solo si quieres cambiarla."
              : "Una foto llama más la atención que el emoji."}
          </p>
          <Button type="submit" className="w-full">
            {draft.id ? "Guardar cambios" : "Publicar paquete"}
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
            const receives = pkgQuote(p).receives;
            return (
              <Card key={p.id} className="space-y-2.5 p-3.5">
                <div className="flex items-center gap-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="h-10 w-10 shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                      {p.emoji || "🎁"}
                    </span>
                  )}
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
                </div>

                <div className="flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                  <MiniAction icon={Eye} label="Vista previa" onClick={() => setPreview(p)} />
                  <MiniAction icon={Share2} label="Difundir" onClick={() => openShare(p)} />
                  {clients.length > 0 && (
                    <MiniAction
                      icon={Send}
                      label="Enviar"
                      onClick={() => {
                        setClientQ("");
                        setSendingTo(p);
                      }}
                    />
                  )}
                  <MiniAction icon={Pencil} label="Editar" onClick={() => openEdit(p)} />
                  <MiniAction icon={Copy} label="Duplicar" onClick={() => openDuplicate(p)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vista previa: así se ve el paquete en la tienda del cliente */}
      <Sheet open={!!preview} onClose={() => setPreview(null)} title="Vista previa">
        {preview &&
          (() => {
            const q = pkgQuote(preview);
            return (
              <>
                <p className="mb-3 text-xs text-muted-foreground">
                  Así se ve en la app de tus clientes.
                </p>
                <Card className="overflow-hidden p-0">
                  {preview.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.image_url}
                      alt={preview.title}
                      className="h-40 w-full object-cover"
                    />
                  ) : null}
                  <div className="flex flex-col gap-2 p-4">
                    {!preview.image_url && (
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                        {preview.emoji || "🎁"}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {preview.title}
                      </p>
                      {q.receives != null && preview.delivery_currency !== "USD" ? (
                        <p className="text-xs font-semibold text-income">
                          Recibe ~{localAmount(q.receives)} {preview.delivery_currency}
                        </p>
                      ) : q.receives != null ? (
                        <p className="text-xs font-semibold text-income">
                          Recibe {usd(q.receives)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Entrega en {preview.delivery_currency || "—"}
                        </p>
                      )}
                      {preview.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {preview.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1 border-t border-border pt-2">
                      <span className="text-sm font-bold text-foreground">
                        Paga {usd(Number(preview.amount_usd))}
                      </span>
                      {preview.highlight ? (
                        <span className="truncate rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {preview.highlight}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </>
            );
          })()}
      </Sheet>

      {/* Enviar a un cliente concreto (WhatsApp) */}
      <Sheet
        open={!!sendingTo}
        onClose={() => setSendingTo(null)}
        title="Enviar a un cliente"
      >
        {sendingTo && (
          <>
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={clientQ}
                onChange={(e) => setClientQ(e.target.value)}
                placeholder="Buscar cliente"
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </div>
            {filteredClients.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin clientes con teléfono.
              </p>
            ) : (
              <div className="max-h-[55vh] space-y-2 overflow-y-auto">
                {filteredClients.map((c) => (
                  <a
                    key={`${c.name}-${c.phone}`}
                    href={`https://wa.me/${c.phone.replace(
                      /\D/g,
                      ""
                    )}?text=${encodeURIComponent(pkgText(sendingTo, c.name))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSendingTo(null)}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition active:scale-[0.99]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-income/10 text-income">
                      <Send className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {c.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.phone}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </Sheet>

      {/* Difundir (foto + texto) */}
      <Sheet
        open={!!sharing}
        onClose={() => {
          setSharing(null);
          setImgUrl(null);
        }}
        title="Difundir paquete"
      >
        {sharing && (
          <>
            <div
              ref={cardRef}
              className={
                "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 p-6 text-white shadow-2xl" +
                (imgUrl ? " hidden" : "")
              }
            >
              <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/10" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PaperPlane className="h-6 w-6 -translate-x-px text-white drop-shadow" />
                    <span className="text-xl font-extrabold tracking-tight">
                      {brand}
                    </span>
                  </div>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                    Paquete
                  </span>
                </div>

                <p className="mt-6 text-5xl">{sharing.emoji || "🎁"}</p>
                <p className="mt-3 text-2xl font-extrabold leading-tight">
                  {sharing.title}
                </p>
                {sharing.description && (
                  <p className="mt-2 text-sm text-white/85">
                    {sharing.description}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">
                    Paga {usd(Number(sharing.amount_usd))}
                  </span>
                  {shareQuote?.receives != null && (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">
                      {sharing.delivery_currency === "USD"
                        ? `Recibe ${usd(shareQuote.receives)}`
                        : `Recibe ~${localAmount(shareQuote.receives)} ${sharing.delivery_currency}`}
                    </span>
                  )}
                </div>
                {sharing.highlight && (
                  <p className="mt-4 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {sharing.highlight}
                  </p>
                )}
                <p className="mt-6 text-center text-xs text-white/70">
                  Envía a Cuba con {brand} ✈️
                </p>
              </div>
            </div>

            {imgUrl && (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl} alt="Paquete" className="w-full rounded-3xl shadow-xl" />
                <p className="text-center text-xs text-muted-foreground">
                  Mantén presionada la imagen para guardarla o enviarla.
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {imgUrl ? (
                <>
                  <button
                    onClick={() => setImgUrl(null)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
                  >
                    <ArrowLeft className="h-4 w-4" /> Volver
                  </button>
                  <a
                    href={imgUrl}
                    download="paquete.png"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
                  >
                    <Download className="h-4 w-4" /> Descargar
                  </a>
                </>
              ) : (
                <>
                  <button
                    onClick={doShareText}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
                  >
                    <Share2 className="h-4 w-4" /> Texto
                  </button>
                  <button
                    onClick={doSharePhoto}
                    disabled={busy}
                    className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-70"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {busy ? "Generando…" : "Compartir foto"}
                  </button>
                </>
              )}
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
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition active:scale-95"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
