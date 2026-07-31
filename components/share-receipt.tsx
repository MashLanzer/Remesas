"use client";

import { useEffect, useRef, useState } from "react";
import {
  Share2,
  Download,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";
import { Button } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { shareNodeAsImage } from "@/lib/share-image";

export type ReceiptData = {
  brand: string;
  date: string;
  clientName?: string | null;
  clientPhone?: string | null;
  beneficiaryName?: string | null;
  province?: string | null;
  amountUsd: string;
  delivered: string;
  status: string;
  phone?: string | null;
  refNumber?: string | null; // nº de comprobante (traza)
  rate?: string | null; // tasa aplicada
};

export function ShareReceipt({
  data,
  autoOpen = false,
}: {
  data: ReceiptData;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  const clientDigits = data.clientPhone?.replace(/\D/g, "");
  const waClient = clientDigits
    ? `https://wa.me/${clientDigits}?text=${encodeURIComponent(
        `Hola ${data.clientName || ""}, aquí el comprobante de tu envío de ${
          data.amountUsd
        } para ${data.beneficiaryName || "tu familiar"}. Estado: ${
          data.status
        }.`
      )}`
    : null;

  function close() {
    setOpen(false);
    setImgUrl(null);
  }

  async function doShare() {
    const node = cardRef.current;
    if (!node) return;
    setSharing(true);
    try {
      // Solo la foto, sin texto (el recibo ya lo dice todo).
      const res = await shareNodeAsImage(node, {
        title: "Comprobante de remesa",
        fileName: `comprobante-${Date.now()}.png`,
      });
      if (res.status === "fallback" && res.dataUrl) setImgUrl(res.dataUrl);
    } catch {
      /* nada */
    } finally {
      setSharing(false);
    }
  }

  const statusDone = data.status === "entregado" || data.status === "liquidado";

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" /> Compartir comprobante
      </Button>

      <Sheet open={open} onClose={close} title="Comprobante">
        {/* Tarjeta del comprobante (estilo tarjeta de negocios) */}
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
            {/* Marca */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PaperPlane className="h-6 w-6 -translate-x-px text-white drop-shadow" />
                <span className="text-xl font-extrabold tracking-tight">
                  {data.brand}
                </span>
              </div>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                Comprobante
              </span>
            </div>

            {/* Monto entregado (lo que recibió la familia) */}
            <div className="mt-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
                Entregado a la familia
              </p>
              <p className="tabular mt-0.5 text-3xl font-extrabold">
                {data.delivered}
              </p>
              <p className="mt-0.5 text-xs text-white/70">
                Envío de {data.amountUsd}
              </p>
            </div>

            {/* Detalles */}
            <div className="mt-4 space-y-1.5 border-t border-white/20 pt-3">
              <RRow label="Beneficiario" value={data.beneficiaryName || "—"} />
              {data.province && <RRow label="Provincia" value={data.province} />}
              {data.clientName && <RRow label="Cliente" value={data.clientName} />}
              {data.rate && <RRow label="Tasa" value={data.rate} />}
              <RRow label="Fecha" value={data.date} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Estado
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold capitalize backdrop-blur">
                  {statusDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {data.status}
                </span>
              </div>
            </div>

            {(data.refNumber || data.phone) && (
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/20 pt-3 text-[11px] text-white/70">
                {data.refNumber ? (
                  <span className="font-mono tracking-wide">
                    Nº {data.refNumber}
                  </span>
                ) : (
                  <span />
                )}
                {data.phone && <span>Contacto: {data.phone}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Respaldo: imagen para guardar/compartir manualmente */}
        {imgUrl && (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Comprobante"
              className="w-full rounded-3xl shadow-xl"
            />
            <p className="text-center text-xs text-muted-foreground">
              Mantén presionada la imagen para guardarla o enviarla por WhatsApp.
            </p>
          </div>
        )}

        {/* Acciones */}
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
                download="comprobante.png"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
              >
                <Download className="h-4 w-4" /> Descargar
              </a>
            </>
          ) : (
            <>
              <button
                onClick={close}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
              >
                Cerrar
              </button>
              <button
                onClick={doShare}
                disabled={sharing}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-70"
              >
                <Share2 className="h-4 w-4" />
                {sharing ? "Generando…" : "Compartir foto"}
              </button>
            </>
          )}
        </div>

        {/* Enviar el comprobante al cliente por WhatsApp */}
        {waClient && !imgUrl && (
          <a
            href={waClient}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-income/10 py-3 text-sm font-semibold text-income transition active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp al cliente
          </a>
        )}
      </Sheet>
    </>
  );
}

function RRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-white/60">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-sm font-medium">
        {value}
      </span>
    </div>
  );
}
