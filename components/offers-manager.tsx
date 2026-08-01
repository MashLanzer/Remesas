"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  Copy,
  Share2,
  ImageIcon,
  ArrowLeft,
  Download,
  Star,
  Send,
  Search,
  Bookmark,
} from "lucide-react";
import {
  Card,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  EmptyState,
} from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { PaperPlane } from "@/components/paper-plane";
import { shareNodeAsImage } from "@/lib/share-image";
import {
  createOffer,
  toggleOffer,
  deleteOffer,
  toggleOfferFeatured,
} from "@/app/actions";
import { OFFER_KINDS, OFFER_TEMPLATES, type Offer } from "@/lib/types";
import { useDialog } from "@/components/confirm";
import { cn } from "@/lib/utils";

type Draft = {
  id?: string;
  title: string;
  kind: string;
  description: string;
  emoji: string;
  starts_at: string;
  ends_at: string;
  imageUrl?: string | null;
  // Efecto automático en el precio (0053).
  auto_apply: boolean;
  new_clients_only: boolean;
  discount_kind: string;
  discount_value: string;
  min_amount_usd: string;
};

type Tpl = { emoji: string; title: string; kind: string; description: string };
type ClientLite = { name: string; phone: string };

const EMPTY: Draft = {
  title: "",
  kind: "tasa",
  description: "",
  emoji: "",
  starts_at: "",
  ends_at: "",
  auto_apply: false,
  new_clients_only: true,
  discount_kind: "comision_cero",
  discount_value: "",
  min_amount_usd: "",
};

const TPL_KEY = "giro_offer_templates";

function fmt(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}
function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) /
      86400000
  );
}
function validityText(o: { starts_at: string | null; ends_at: string | null }) {
  if (o.ends_at) return `Válido hasta ${fmt(o.ends_at)}`;
  if (o.starts_at) return `Desde ${fmt(o.starts_at)}`;
  return null;
}
function scheduleLabel(o: Offer, today: string): string | null {
  if (!o.active) return null;
  if (o.starts_at && o.starts_at > today) {
    const d = daysBetween(today, o.starts_at);
    return `Empieza en ${d} día${d !== 1 ? "s" : ""}`;
  }
  if (o.ends_at && o.ends_at >= today) {
    const d = daysBetween(today, o.ends_at);
    return d === 0 ? "Termina hoy" : `Termina en ${d} día${d !== 1 ? "s" : ""}`;
  }
  return null;
}
function offerState(o: Offer, today: string) {
  if (!o.active)
    return { label: "Oculta", cls: "bg-muted text-muted-foreground" };
  if (o.starts_at && o.starts_at > today)
    return { label: "Programada", cls: "bg-info/10 text-info" };
  if (o.ends_at && o.ends_at < today)
    return { label: "Vencida", cls: "bg-destructive/10 text-destructive" };
  return { label: "Activa", cls: "bg-income/10 text-income" };
}
function kindMeta(o: Offer) {
  const k = OFFER_KINDS.find((x) => x.key === o.kind);
  return { emoji: o.emoji || k?.emoji || "📣", label: k?.label ?? "Anuncio" };
}

export function OffersManager({
  offers,
  brand = "Giro",
  clients = [],
}: {
  offers: Offer[];
  brand?: string;
  clients?: ClientLite[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [preview, setPreview] = useState<Offer | null>(null);
  const [sharing, setSharing] = useState<Offer | null>(null);
  const [sendingTo, setSendingTo] = useState<Offer | null>(null);
  const [clientQ, setClientQ] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [customTpls, setCustomTpls] = useState<Tpl[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const { confirm, notify } = useDialog();

  const today = new Date().toISOString().slice(0, 10);

  // Plantillas propias (guardadas en el dispositivo).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TPL_KEY);
      if (raw) setCustomTpls(JSON.parse(raw));
    } catch {
      /* nada */
    }
  }, []);
  function persistTpls(next: Tpl[]) {
    setCustomTpls(next);
    try {
      localStorage.setItem(TPL_KEY, JSON.stringify(next));
    } catch {
      /* nada */
    }
  }
  function saveAsTemplate() {
    if (!draft.title.trim()) return;
    persistTpls([
      {
        emoji: draft.emoji,
        title: draft.title,
        kind: draft.kind,
        description: draft.description,
      },
      ...customTpls,
    ].slice(0, 12));
    notify("Plantilla guardada");
  }

  function openBlank() {
    setDraft(EMPTY);
    setOpen(true);
  }
  function openTpl(t: Tpl) {
    setDraft({ ...EMPTY, title: t.title, kind: t.kind, description: t.description, emoji: t.emoji });
    setOpen(true);
  }
  function openEdit(o: Offer) {
    setDraft({
      id: o.id,
      title: o.title,
      kind: o.kind || "tasa",
      description: o.description || "",
      emoji: o.emoji || "",
      starts_at: o.starts_at || "",
      ends_at: o.ends_at || "",
      imageUrl: o.image_url,
      auto_apply: !!o.auto_apply,
      new_clients_only: o.new_clients_only !== false,
      discount_kind: o.discount_kind || "comision_cero",
      discount_value:
        o.discount_value != null ? String(o.discount_value) : "",
      min_amount_usd: o.min_amount_usd ? String(o.min_amount_usd) : "",
    });
    setOpen(true);
  }
  function openDuplicate(o: Offer) {
    setDraft({
      title: `${o.title} (copia)`,
      kind: o.kind || "tasa",
      description: o.description || "",
      emoji: o.emoji || "",
      starts_at: "",
      ends_at: "",
      auto_apply: !!o.auto_apply,
      new_clients_only: o.new_clients_only !== false,
      discount_kind: o.discount_kind || "comision_cero",
      discount_value:
        o.discount_value != null ? String(o.discount_value) : "",
      min_amount_usd: o.min_amount_usd ? String(o.min_amount_usd) : "",
    });
    setOpen(true);
  }

  const set = (k: keyof Draft) => (v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  function openShare(o: Offer) {
    setImgUrl(null);
    setSharing(o);
  }
  async function doSharePhoto() {
    const node = cardRef.current;
    if (!node) return;
    setBusy(true);
    try {
      const res = await shareNodeAsImage(node, {
        title: sharing?.title || "Promoción",
        fileName: `promo-${Date.now()}.png`,
      });
      if (res.status === "fallback" && res.dataUrl) setImgUrl(res.dataUrl);
    } catch {
      /* nada */
    } finally {
      setBusy(false);
    }
  }
  function promoText(o: Offer, name?: string): string {
    const v = validityText(o);
    return [
      name ? `Hola ${name}!` : null,
      `${kindMeta(o).emoji} ${o.title}`,
      o.description || null,
      v || null,
      `— ${brand} ✈️`,
    ]
      .filter(Boolean)
      .join("\n");
  }
  async function doShareText() {
    const o = sharing;
    if (!o) return;
    const text = promoText(o);
    try {
      if (navigator.share) {
        await navigator.share({ title: o.title, text });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      notify("Promoción copiada");
    } catch {
      /* nada */
    }
  }

  const filteredClients = useMemo(() => {
    const t = clientQ.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(t));
  }, [clients, clientQ]);

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={openBlank}>
        <Plus className="h-4 w-4" /> Nueva promoción
      </Button>

      {/* Plantillas */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Empezar con una plantilla
        </p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {customTpls.map((t, i) => (
            <div
              key={`c-${i}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 py-2 pl-3 pr-1.5 text-sm font-medium text-foreground"
            >
              <button
                onClick={() => openTpl(t)}
                className="flex items-center gap-2 transition active:scale-95"
              >
                <span className="text-base">{t.emoji || "📣"}</span>
                {t.title}
              </button>
              <button
                onClick={() =>
                  persistTpls(customTpls.filter((_, idx) => idx !== i))
                }
                aria-label="Borrar plantilla"
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {OFFER_TEMPLATES.map((t) => (
            <button
              key={t.title}
              onClick={() => openTpl(t)}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition active:scale-95"
            >
              <span className="text-base">{t.emoji}</span>
              {t.title}
            </button>
          ))}
        </div>
      </div>

      {/* Crear / editar */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "Editar promoción" : "Nueva promoción"}
      >
        <form
          action={async (fd) => {
            await createOffer(fd);
            setOpen(false);
          }}
          className="space-y-3"
        >
          {draft.id && <input type="hidden" name="id" value={draft.id} />}
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
          {draft.kind === "bono" && (
            <p className="rounded-xl bg-primary/10 px-3 py-2 text-[11px] leading-relaxed text-primary">
              🎁 Al cliente le aparecerá su enlace de invitación para referir
              amigos (el bono en puntos se paga solo al primer envío entregado).
            </p>
          )}
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
              <Input
                type="date"
                name="starts_at"
                value={draft.starts_at}
                onChange={(e) => set("starts_at")(e.target.value)}
              />
            </Field>
            <Field label="Hasta (opcional)">
              <Input
                type="date"
                name="ends_at"
                value={draft.ends_at}
                onChange={(e) => set("ends_at")(e.target.value)}
              />
            </Field>
          </div>

          {/* Descuento automático (efecto real en el precio) */}
          <input
            type="hidden"
            name="auto_apply"
            value={draft.auto_apply ? "1" : "0"}
          />
          <input
            type="hidden"
            name="new_clients_only"
            value={draft.new_clients_only ? "1" : "0"}
          />
          <div className="space-y-3 rounded-2xl border border-border p-3">
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({ ...d, auto_apply: !d.auto_apply }))
              }
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Aplicar descuento automático
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  La app baja el precio sola al registrar la remesa.
                </span>
              </span>
              <span
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition",
                  draft.auto_apply ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    draft.auto_apply ? "left-[22px]" : "left-0.5"
                  )}
                />
              </span>
            </button>

            {draft.auto_apply ? (
              <div className="space-y-3">
                <Field label="Efecto">
                  <Select
                    name="discount_kind"
                    value={draft.discount_kind}
                    onChange={(e) => set("discount_kind")(e.target.value)}
                    title="Efecto de la promoción"
                  >
                    <option value="comision_cero">Sin comisión (gratis)</option>
                    <option value="comision_pct">Comisión −%</option>
                    <option value="comision_flat">Comisión −$</option>
                    <option value="tasa_bonus">Mejor tasa (+ por USD)</option>
                  </Select>
                </Field>
                {draft.discount_kind !== "comision_cero" && (
                  <Field
                    label={
                      draft.discount_kind === "comision_pct"
                        ? "% de descuento en la comisión"
                        : draft.discount_kind === "comision_flat"
                        ? "$ de descuento en la comisión"
                        : "Cuánto mejora la tasa (por USD)"
                    }
                  >
                    <Input
                      type="number"
                      name="discount_value"
                      min="0"
                      step="0.01"
                      value={draft.discount_value}
                      onChange={(e) => set("discount_value")(e.target.value)}
                      placeholder={
                        draft.discount_kind === "comision_pct"
                          ? "20"
                          : draft.discount_kind === "comision_flat"
                          ? "1"
                          : "2"
                      }
                    />
                  </Field>
                )}
                <Field label="Monto mínimo del envío ($)" hint="0 = sin mínimo.">
                  <Input
                    type="number"
                    name="min_amount_usd"
                    min="0"
                    step="1"
                    value={draft.min_amount_usd}
                    onChange={(e) => set("min_amount_usd")(e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      new_clients_only: !d.new_clients_only,
                    }))
                  }
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="text-sm font-medium text-foreground">
                    Solo clientes nuevos
                  </span>
                  <span
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition",
                      draft.new_clients_only ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        draft.new_clients_only ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </span>
                </button>
                <p className="rounded-xl bg-income/10 px-3 py-2 text-[11px] leading-relaxed text-income">
                  ✅ Aplica automáticamente dentro de la ventana de fechas de
                  arriba
                  {draft.new_clients_only
                    ? ", solo en el PRIMER envío de un cliente nuevo"
                    : ""}
                  . La comisión nunca queda negativa.
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                ⚠️ Apagado: la oferta es solo un cartel y NO cambia el precio. Tú
                aplicas el descuento a mano al registrar la remesa.
              </p>
            )}
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
              : "Un anuncio con foto llama más la atención del cliente."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveAsTemplate}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground transition active:scale-[0.98]"
            >
              <Bookmark className="h-4 w-4" /> Plantilla
            </button>
            <Button type="submit" className="flex-1">
              {draft.id ? "Guardar cambios" : "Publicar promoción"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Lista */}
      {offers.length === 0 ? (
        <EmptyState
          title="Sin promociones"
          description="Toca una plantilla de arriba o crea la tuya desde cero."
        />
      ) : (
        <div className="space-y-2">
          {offers.map((o) => {
            const k = OFFER_KINDS.find((x) => x.key === o.kind);
            const st = offerState(o, today);
            const sched = scheduleLabel(o, today);
            const expired = st.label === "Vencida";
            return (
              <Card
                key={o.id}
                className={cn(
                  "space-y-2.5 p-3.5",
                  expired && "opacity-60",
                  o.featured && "border-primary/40 ring-1 ring-primary/20"
                )}
              >
                <div className="flex items-center gap-3">
                  {o.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.image_url}
                      alt={o.title || "Oferta"}
                      className="h-10 w-10 shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                      {o.emoji || k?.emoji || "📣"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
                      {o.featured && (
                        <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />
                      )}
                      {o.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          st.cls
                        )}
                      >
                        {st.label}
                      </span>
                      {sched && (
                        <span className="text-[11px] text-muted-foreground">
                          {sched}
                        </span>
                      )}
                      {typeof o.view_count === "number" && o.view_count > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <Eye className="h-3 w-3" /> {o.view_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      start(() => toggleOfferFeatured(o.id, !o.featured))
                    }
                    disabled={pending}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border border-border transition active:scale-90 disabled:opacity-50",
                      o.featured ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-label={o.featured ? "Quitar destacada" : "Destacar"}
                    title="Destacar"
                  >
                    <Star
                      className={cn("h-4 w-4", o.featured && "fill-primary")}
                    />
                  </button>
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
                </div>

                <div className="flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                  <MiniAction icon={Eye} label="Vista previa" onClick={() => setPreview(o)} />
                  <MiniAction icon={Share2} label="Difundir" onClick={() => openShare(o)} />
                  {clients.length > 0 && (
                    <MiniAction
                      icon={Send}
                      label="Enviar"
                      onClick={() => {
                        setClientQ("");
                        setSendingTo(o);
                      }}
                    />
                  )}
                  <MiniAction icon={Pencil} label="Editar" onClick={() => openEdit(o)} />
                  <MiniAction icon={Copy} label="Duplicar" onClick={() => openDuplicate(o)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vista previa */}
      <Sheet open={!!preview} onClose={() => setPreview(null)} title="Vista previa">
        {preview && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Así se ve en la app de tus clientes.
            </p>
            <Card className="overflow-hidden p-0">
              {preview.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.image_url} alt={preview.title || "Oferta"} className="h-40 w-full object-cover" />
              )}
              <div className="flex gap-3 p-3.5">
                {!preview.image_url && (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                    {kindMeta(preview).emoji}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-foreground">
                      {preview.title}
                    </p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {kindMeta(preview).label}
                    </span>
                  </div>
                  {preview.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {preview.description}
                    </p>
                  )}
                  {validityText(preview) && (
                    <p className="mt-1 text-[11px] font-medium text-primary">
                      {validityText(preview)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </>
        )}
      </Sheet>

      {/* Enviar a un cliente concreto */}
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
                    )}?text=${encodeURIComponent(promoText(sendingTo, c.name))}`}
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
        title="Difundir promoción"
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
                    {kindMeta(sharing).label}
                  </span>
                </div>

                <p className="mt-6 text-5xl">{kindMeta(sharing).emoji}</p>
                <p className="mt-3 text-2xl font-extrabold leading-tight">
                  {sharing.title}
                </p>
                {sharing.description && (
                  <p className="mt-2 text-sm text-white/85">
                    {sharing.description}
                  </p>
                )}
                {validityText(sharing) && (
                  <p className="mt-4 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {validityText(sharing)}
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
                <img src={imgUrl} alt="Promoción" className="w-full rounded-3xl shadow-xl" />
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
                    download="promo.png"
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
