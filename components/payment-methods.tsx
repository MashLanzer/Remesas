"use client";

import { useRef, useState } from "react";
import {
  Copy,
  Check,
  Share2,
  Download,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";
import { Card, Button } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { shareNodeAsImage } from "@/lib/share-image";
import { useDialog } from "@/components/confirm";

type M = { k: string; v: string };

export function PaymentMethods({
  name,
  brand = "Giro",
  phone,
  zelle,
  cashapp,
  paypal,
}: {
  name?: string | null;
  brand?: string | null;
  phone?: string | null;
  zelle?: string | null;
  cashapp?: string | null;
  paypal?: string | null;
}) {
  const { notify } = useDialog();
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const methods: M[] = [
    zelle ? { k: "Zelle", v: zelle } : null,
    cashapp ? { k: "CashApp", v: cashapp } : null,
    paypal ? { k: "PayPal", v: paypal } : null,
  ].filter(Boolean) as M[];

  const brandName = brand || "Giro";

  if (methods.length === 0) {
    return (
      <Card className="text-center text-sm text-muted-foreground">
        Añade tus métodos de cobro abajo para copiarlos o compartirlos.
      </Card>
    );
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* nada */
    }
  }

  const allText =
    `Datos de cobro${name ? ` de ${name}` : ""}:\n` +
    methods.map((m) => `${m.k}: ${m.v}`).join("\n");

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(allText);
      notify("Datos de cobro copiados");
    } catch {
      /* nada */
    }
  }

  async function sharePhoto() {
    const node = cardRef.current;
    if (!node) return;
    setSharing(true);
    try {
      const res = await shareNodeAsImage(node, {
        title: "Datos de cobro",
        fileName: `cobro-${Date.now()}.png`,
      });
      if (res.status === "fallback" && res.dataUrl) setImgUrl(res.dataUrl);
    } catch {
      /* nada */
    } finally {
      setSharing(false);
    }
  }

  return (
    <Card className="space-y-2.5">
      {methods.map((m) => (
        <div key={m.k} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{m.k}</p>
            <p className="truncate text-sm font-semibold text-foreground">
              {m.v}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copy(m.k, m.v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition active:scale-90"
            aria-label={`Copiar ${m.k}`}
          >
            {copied === m.k ? (
              <Check className="h-4 w-4 text-income" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      ))}

      <div className="flex gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={copyAll}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground transition active:scale-[0.98]"
        >
          <Copy className="h-4 w-4" /> Copiar todos
        </button>
        <button
          type="button"
          onClick={() => {
            setImgUrl(null);
            setOpen(true);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
        >
          <Share2 className="h-4 w-4" /> Compartir foto
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setImgUrl(null);
        }}
        title="Datos de cobro"
      >
        <div
          ref={cardRef}
          className={
            "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 p-5 text-white shadow-2xl" +
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
                  {brandName}
                </span>
              </div>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                Cómo pagarme
              </span>
            </div>

            {name && <p className="mt-2 text-sm font-semibold text-white/90">{name}</p>}

            <div className="mt-4 space-y-3 border-t border-white/20 pt-4">
              {methods.map((m) => (
                <div key={m.k} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-white/80">{m.k}</span>
                  <span className="min-w-0 truncate text-right text-base font-bold">
                    {m.v}
                  </span>
                </div>
              ))}
              {phone && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-white/80">WhatsApp</span>
                  <span className="text-base font-bold">{phone}</span>
                </div>
              )}
            </div>

            <p className="mt-5 text-center text-xs text-white/70">
              Envía a Cuba con {brandName} ✈️
            </p>
          </div>
        </div>

        {imgUrl && (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl} alt="Datos de cobro" className="w-full rounded-3xl shadow-xl" />
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
                download="datos-cobro.png"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
              >
                <Download className="h-4 w-4" /> Descargar
              </a>
            </>
          ) : (
            <>
              <button
                onClick={copyAll}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
              >
                <Copy className="h-4 w-4" /> Copiar
              </button>
              <button
                onClick={sharePhoto}
                disabled={sharing}
                className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-70"
              >
                <ImageIcon className="h-4 w-4" />
                {sharing ? "Generando…" : "Compartir foto"}
              </button>
            </>
          )}
        </div>
      </Sheet>
    </Card>
  );
}
