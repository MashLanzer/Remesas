"use client";

import { useMemo, useRef, useState } from "react";
import { Share2, Download, ArrowLeft, Copy, Check } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";
import { Button } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { shareNodeAsImage } from "@/lib/share-image";
import { localAmount, cn } from "@/lib/utils";
import type { ExchangeRate } from "@/lib/types";

export function ShareRates({
  brand,
  date,
  rates,
}: {
  brand: string;
  date: string;
  rates: ExchangeRate[];
}) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const cardRef = useRef<HTMLDivElement>(null);

  const active = rates.filter(
    (r) => r.active !== false && Number(r.rate) > 0
  );
  const shown = active.filter((r) => !excluded.has(r.currency));

  const text = useMemo(() => {
    const lines = shown.map(
      (r) => `1 USD = ${localAmount(Number(r.rate))} ${r.currency}`
    );
    return `${brand} · Tasas del día\n${date}\n\n${lines.join(
      "\n"
    )}\n\nEnvía a Cuba con ${brand} ✈️`;
  }, [shown, brand, date]);

  function toggle(currency: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(currency)) next.delete(currency);
      else next.add(currency);
      return next;
    });
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nada */
    }
  }

  function close() {
    setOpen(false);
    setImgUrl(null);
  }

  async function doShare() {
    const node = cardRef.current;
    if (!node) return;
    setSharing(true);
    try {
      const res = await shareNodeAsImage(node, {
        title: "Tasas del día",
        fileName: `tasas-${Date.now()}.png`,
      });
      if (res.status === "fallback" && res.dataUrl) setImgUrl(res.dataUrl);
    } catch {
      /* nada */
    } finally {
      setSharing(false);
    }
  }

  if (active.length === 0) return null;

  return (
    <>
      <Button
        variant="secondary"
        className="mb-4 w-full"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4" /> Compartir tasas del día
      </Button>

      <Sheet open={open} onClose={close} title="Tasas del día">
        {/* Elegir qué monedas incluir */}
        {!imgUrl && active.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {active.map((r) => {
              const on = !excluded.has(r.currency);
              return (
                <button
                  key={r.currency}
                  type="button"
                  onClick={() => toggle(r.currency)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-95",
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {r.currency}
                </button>
              );
            })}
          </div>
        )}

        {/* Tarjeta de tasas (estilo recibo) */}
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
                Tasas del día
              </span>
            </div>

            <p className="mt-1 text-xs text-white/70">{date}</p>

            <div className="mt-5 space-y-3 border-t border-white/20 pt-4">
              {shown.map((r) => (
                <div
                  key={r.currency}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="text-sm font-medium text-white/80">
                    1 USD =
                  </span>
                  <span className="tabular text-2xl font-extrabold leading-none">
                    {localAmount(Number(r.rate))}{" "}
                    <span className="text-sm font-semibold text-white/70">
                      {r.currency}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-center text-xs text-white/70">
              Envía a Cuba rápido y seguro con {brand} ✈️
            </p>
          </div>
        </div>

        {imgUrl && (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Tasas del día"
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
                download="tasas.png"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
              >
                <Download className="h-4 w-4" /> Descargar
              </a>
            </>
          ) : (
            <>
              <button
                onClick={copyText}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-income" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copiar texto
                  </>
                )}
              </button>
              <button
                onClick={doShare}
                disabled={sharing || shown.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-70"
              >
                <Share2 className="h-4 w-4" />
                {sharing ? "Generando…" : "Compartir foto"}
              </button>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
