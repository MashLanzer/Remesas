"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Share2, X, MessageCircle, QrCode, Download, ArrowLeft } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";
import { useDialog } from "@/components/confirm";

export function ShareCard({
  name,
  businessName,
  phone,
  zelle,
  cashapp,
  paypal,
  variant = "icon",
}: {
  name?: string | null;
  businessName?: string | null;
  phone?: string | null;
  zelle?: string | null;
  cashapp?: string | null;
  paypal?: string | null;
  // "icon": botón redondo pequeño (cabecera). "button": botón con borde y
  // texto, centrado (para la hoja de perfil).
  variant?: "icon" | "button";
}) {
  const { notify } = useDialog();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  function closeSheet() {
    setOpen(false);
    setImgUrl(null);
  }

  // Bloquea el scroll del fondo mientras el sheet está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const brand = "Giro";
  const subtitle = businessName || "Envíos a Cuba";

  const pays = [
    zelle && { k: "Zelle", v: zelle },
    cashapp && { k: "CashApp", v: cashapp },
    paypal && { k: "PayPal", v: paypal },
  ].filter(Boolean) as { k: string; v: string }[];

  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name || brand}`,
    `ORG:${businessName || brand}`,
    phone ? `TEL;TYPE=CELL:${phone}` : "",
    pays.length ? `NOTE:${pays.map((p) => `${p.k}: ${p.v}`).join(" · ")}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  function buildText() {
    const lines: string[] = [`📇 ${brand}${name ? ` · ${name}` : ""}`];
    if (phone) lines.push(`📱 WhatsApp: ${phone}`);
    if (pays.length) {
      lines.push("", "Métodos de pago:");
      pays.forEach((p) => lines.push(`${p.k}: ${p.v}`));
    }
    return lines.join("\n");
  }

  async function share() {
    const text = buildText();
    try {
      if (navigator.share) {
        await navigator.share({ title: brand, text });
        return;
      }
    } catch {
      /* cancelado */
    }
    try {
      await navigator.clipboard.writeText(text);
      notify("Tarjeta copiada al portapapeles");
    } catch {
      /* nada */
    }
  }

  // Comparte la tarjeta como imagen (foto). Si no se puede, la descarga; y si
  // tampoco, cae al compartir de texto.
  async function shareImage() {
    const node = cardRef.current;
    if (!node) return share();
    setSharing(true);
    try {
      const { toPng } = await import("html-to-image");
      const opts = { pixelRatio: 2, cacheBust: true, skipFonts: true };
      // El primer render suele fallar por estilos/fuentes: se hace un calentamiento.
      await toPng(node, opts).catch(() => {});
      const dataUrl = await toPng(node, opts);

      // === APK (nativo): escribir el PNG y compartir con el plugin nativo ===
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        try {
          const { Filesystem, Directory } = await import("@capacitor/filesystem");
          const { Share } = await import("@capacitor/share");
          const base64 = dataUrl.split(",")[1];
          const fileName = `tarjeta-giro-${Date.now()}.png`;
          const written = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Cache,
          });
          await Share.share({
            title: brand,
            text: buildText(),
            files: [written.uri],
          });
          setSharing(false);
          return;
        } catch {
          // Si algo falla en nativo, mostramos la imagen como respaldo.
          setImgUrl(dataUrl);
          return;
        }
      }

      // === Web: compartir el archivo si el navegador lo permite ===
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "tarjeta-giro.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: brand, text: buildText() });
          setSharing(false);
          return;
        }
      } catch {
        /* sigue al respaldo visible */
      }

      // Respaldo: mostrar la imagen para guardar/compartir.
      setImgUrl(dataUrl);
    } catch {
      await share();
    } finally {
      setSharing(false);
    }
  }

  const sheet =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
            onClick={closeSheet}
          >
            <div
              className="gi-sheet max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 pb-8 sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Tu tarjeta</p>
                <button
                  onClick={closeSheet}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tarjeta de negocios (todo dentro) */}
              <div
                ref={cardRef}
                className={
                  "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 p-5 text-white shadow-2xl" +
                  (imgUrl ? " hidden" : "")
                }
              >
                {/* brillo */}
                <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/10" />

                <div className="relative">
                  {/* Marca + Titular (izq) · QR grande (der) */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <PaperPlane className="h-6 w-6 -translate-x-px text-white drop-shadow" />
                        <span className="text-2xl font-extrabold tracking-tight">
                          {brand}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-white/70">
                        {subtitle}
                      </p>

                      <div className="mt-5">
                        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
                          Titular
                        </p>
                        <p className="truncate text-lg font-semibold tracking-wide">
                          {name || "Sin nombre"}
                        </p>
                        {phone && (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
                            <MessageCircle className="h-4 w-4 shrink-0" />
                            <span className="break-all">{phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-center">
                      <div className="rounded-2xl bg-white p-2 shadow-lg">
                        <QRCodeSVG value={vcard} size={116} level="M" />
                      </div>
                      <p className="mt-1.5 text-[10px] text-white/70">Escanéame</p>
                    </div>
                  </div>

                  {/* Métodos de cobro (todo el ancho) */}
                  {pays.length > 0 ? (
                    <div className="mt-4 space-y-1.5 border-t border-white/20 pt-3">
                      {pays.map((p) => (
                        <div key={p.k} className="flex items-baseline gap-3">
                          <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/60">
                            {p.k}
                          </span>
                          <span className="min-w-0 flex-1 break-all text-sm font-medium">
                            {p.v}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !phone && (
                      <p className="mt-4 border-t border-white/20 pt-3 text-sm text-white/70">
                        Añade tu teléfono y métodos de cobro en el perfil.
                      </p>
                    )
                  )}
                </div>
              </div>

              {/* Vista previa de la imagen (respaldo cuando no se puede compartir el archivo) */}
              {imgUrl && (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt="Tarjeta de Giro"
                    className="w-full rounded-3xl shadow-xl"
                  />
                  <p className="text-center text-xs text-muted-foreground">
                    Mantén presionada la imagen para guardarla o enviarla por
                    WhatsApp.
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
                      download="tarjeta-giro.png"
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
                    >
                      <Download className="h-4 w-4" /> Descargar
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      onClick={closeSheet}
                      className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={shareImage}
                      disabled={sharing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-70"
                    >
                      <Share2 className="h-4 w-4" />
                      {sharing ? "Generando…" : "Compartir"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {variant === "button" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
          aria-label="Mi tarjeta"
        >
          <QrCode className="h-5 w-5 text-primary" /> Ver mi tarjeta
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
          aria-label="Mi tarjeta"
          title="Mi tarjeta"
        >
          <QrCode className="h-5 w-5" />
        </button>
      )}
      {sheet}
    </>
  );
}
