"use client";

import { useRef, useState, useTransition } from "react";
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
import { createOffer, toggleOffer, deleteOffer } from "@/app/actions";
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
};

const EMPTY: Draft = {
  title: "",
  kind: "tasa",
  description: "",
  emoji: "",
  starts_at: "",
  ends_at: "",
};

function fmt(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function validityText(o: { starts_at: string | null; ends_at: string | null }) {
  if (o.ends_at) return `Válido hasta ${fmt(o.ends_at)}`;
  if (o.starts_at) return `Desde ${fmt(o.starts_at)}`;
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
}: {
  offers: Offer[];
  brand?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [preview, setPreview] = useState<Offer | null>(null);
  const [sharing, setSharing] = useState<Offer | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { confirm } = useDialog();

  const today = new Date().toISOString().slice(0, 10);

  function openBlank() {
    setDraft(EMPTY);
    setOpen(true);
  }
  function openTemplate(t: (typeof OFFER_TEMPLATES)[number]) {
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
  async function doShareText() {
    const o = sharing;
    if (!o) return;
    const v = validityText(o);
    const text = [
      `${kindMeta(o).emoji} ${o.title}`,
      o.description || null,
      v || null,
      `— ${brand} ✈️`,
    ]
      .filter(Boolean)
      .join("\n");
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
    } catch {
      /* nada */
    }
  }

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
          <Field label="Imagen (opcional)">
            <input
              type="file"
              name="image"
              accept="image/*"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </Field>
          {draft.imageUrl ? (
            <p className="-mt-1 text-[11px] text-muted-foreground">
              Ya tiene imagen. Sube una nueva solo si quieres cambiarla.
            </p>
          ) : (
            <p className="-mt-1 text-[11px] text-muted-foreground">
              Un anuncio con foto llama más la atención del cliente.
            </p>
          )}
          <Button type="submit" className="w-full">
            {draft.id ? "Guardar cambios" : "Publicar promoción"}
          </Button>
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
            return (
              <Card key={o.id} className="space-y-2.5 p-3.5">
                <div className="flex items-center gap-3">
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
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          st.cls
                        )}
                      >
                        {st.label}
                      </span>
                      {k && (
                        <span className="truncate text-xs text-muted-foreground">
                          {k.label}
                        </span>
                      )}
                    </div>
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
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                  <MiniAction icon={Eye} label="Vista previa" onClick={() => setPreview(o)} />
                  <MiniAction icon={Share2} label="Difundir" onClick={() => openShare(o)} />
                  <MiniAction icon={Pencil} label="Editar" onClick={() => openEdit(o)} />
                  <MiniAction icon={Copy} label="Duplicar" onClick={() => openDuplicate(o)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vista previa (como la ve el cliente) */}
      <Sheet
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Vista previa"
      >
        {preview && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Así se ve en la app de tus clientes.
            </p>
            <Card className="overflow-hidden p-0">
              {preview.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.image_url}
                  alt=""
                  className="h-40 w-full object-cover"
                />
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
                <img
                  src={imgUrl}
                  alt="Promoción"
                  className="w-full rounded-3xl shadow-xl"
                />
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
