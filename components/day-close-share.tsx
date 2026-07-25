"use client";

import { useRef, useState } from "react";
import {
  Share2,
  Download,
  ArrowLeft,
  Copy,
  Check,
  ImageIcon,
  PartyPopper,
} from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";
import { Sheet } from "@/components/sheet";
import { shareNodeAsImage } from "@/lib/share-image";
import { useDialog } from "@/components/confirm";
import { usd } from "@/lib/utils";

type Period = {
  key: string;
  label: string;
  dateLabel: string;
  count: number;
  earned: number;
  delivered: number;
};

// Cierre del repartidor por periodo (hoy/semana/mes): resumen compartible.
export function DayCloseShare({
  brand,
  name,
  periods,
}: {
  brand: string;
  name: string | null;
  periods: Period[];
}) {
  const { notify } = useDialog();
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [periodKey, setPeriodKey] = useState(periods[0]?.key);
  const cardRef = useRef<HTMLDivElement>(null);

  const p = periods.find((x) => x.key === periodKey) ?? periods[0];
  const { label, dateLabel, count, earned, delivered } = p;
  const heading = label === "Hoy" ? "Cierre del día" : `Cierre · ${label}`;

  const text = [
    `${heading} · ${brand}`,
    dateLabel,
    ``,
    `Remesas entregadas: ${count}`,
    `Entregado a familias: ${usd(delivered)}`,
    `Ganaste: ${usd(earned)}`,
  ].join("\n");

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
        title: "Cierre del día",
        fileName: `cierre-dia-${Date.now()}.png`,
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
        await navigator.share({ title: "Cierre del día", text });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notify("Cierre del día copiado");
    } catch {
      /* nada */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition active:scale-[0.99]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-income/10 text-income">
          <PartyPopper className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Cierre del repartidor
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Hoy: {periods[0].count}{" "}
            {periods[0].count === 1 ? "entrega" : "entregas"} · ganaste{" "}
            {usd(periods[0].earned)}
          </p>
        </div>
        <Share2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={open} onClose={close} title="Cierre del repartidor">
        {/* Selector de periodo */}
        {!imgUrl && periods.length > 1 && (
          <div className="mb-3 flex gap-2">
            {periods.map((x) => (
              <button
                key={x.key}
                type="button"
                onClick={() => setPeriodKey(x.key)}
                className={
                  "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition " +
                  (x.key === periodKey
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground")
                }
              >
                {x.label}
              </button>
            ))}
          </div>
        )}

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
                {heading}
              </span>
            </div>

            {name && (
              <p className="mt-2 text-sm font-semibold text-white/90">{name}</p>
            )}
            <p className="text-xs text-white/70">{dateLabel}</p>

            <div className="mt-4 space-y-2 border-t border-white/20 pt-4">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-white/80">Remesas entregadas</span>
                <span className="tabular font-semibold">{count}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-white/80">Entregado a familias</span>
                <span className="tabular font-semibold">{usd(delivered)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-white/20 pt-4">
              <span className="text-sm font-medium text-white/80">Ganaste</span>
              <span className="tabular text-2xl font-extrabold leading-none">
                {usd(earned)}
              </span>
            </div>

            <p className="mt-5 text-center text-xs text-white/70">
              ¡Buen trabajo! Generado con {brand} ✈️
            </p>
          </div>
        </div>

        {imgUrl && (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Cierre del día"
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
                download="cierre-dia.png"
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
