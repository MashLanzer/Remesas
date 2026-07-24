"use client";

import { useRef, useState } from "react";
import { Share2, Download, ArrowLeft, Copy, Check, ImageIcon } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";
import { Button } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { shareNodeAsImage } from "@/lib/share-image";
import { useDialog } from "@/components/confirm";

export function ShareStatement({
  text,
  brand,
  title,
  date,
  rows,
  balanceLabel,
  balance,
}: {
  text: string;
  brand: string;
  title: string;
  date: string;
  rows: { label: string; value: string }[];
  balanceLabel: string;
  balance: string;
}) {
  const { notify } = useDialog();
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    setImgUrl(null);
  }

  async function sharePhoto() {
    const node = cardRef.current;
    if (!node) return;
    setSharing(true);
    try {
      const res = await shareNodeAsImage(node, {
        title: "Estado de cuenta",
        fileName: `estado-cuenta-${Date.now()}.png`,
      });
      if (res.status === "fallback" && res.dataUrl) setImgUrl(res.dataUrl);
    } catch {
      /* nada */
    } finally {
      setSharing(false);
    }
  }

  async function shareText() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Estado de cuenta", text });
        return;
      }
    } catch {
      /* cancelado */
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notify("Estado de cuenta copiado");
    } catch {
      /* nada */
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4" /> Compartir estado de cuenta
      </Button>

      <Sheet open={open} onClose={close} title="Estado de cuenta">
        {/* Tarjeta (estilo recibo) */}
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
                  {brand}
                </span>
              </div>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                Estado de cuenta
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-white/90">{title}</p>
            <p className="text-xs text-white/70">{date}</p>

            <div className="mt-4 space-y-2 border-t border-white/20 pt-4">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-white/80">{r.label}</span>
                  <span className="tabular font-semibold">{r.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-white/20 pt-4">
              <span className="text-sm font-medium text-white/80">
                {balanceLabel}
              </span>
              <span className="tabular text-2xl font-extrabold leading-none">
                {balance}
              </span>
            </div>

            <p className="mt-5 text-center text-xs text-white/70">
              Generado con {brand} ✈️
            </p>
          </div>
        </div>

        {imgUrl && (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Estado de cuenta"
              className="w-full rounded-3xl shadow-xl"
            />
            <p className="text-center text-xs text-muted-foreground">
              Mantén presionada la imagen para guardarla o enviarla por WhatsApp.
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
                download="estado-cuenta.png"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
              >
                <Download className="h-4 w-4" /> Descargar
              </a>
            </>
          ) : (
            <>
              <button
                onClick={shareText}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-income" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Texto
                  </>
                )}
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
    </>
  );
}
