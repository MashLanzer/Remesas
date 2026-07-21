"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Share2, X, MessageCircle, QrCode } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";

export function ShareCard({
  name,
  businessName,
  phone,
  zelle,
  cashapp,
  paypal,
}: {
  name?: string | null;
  businessName?: string | null;
  phone?: string | null;
  zelle?: string | null;
  cashapp?: string | null;
  paypal?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
      alert("Tarjeta copiada al portapapeles");
    } catch {
      /* nada */
    }
  }

  const sheet =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="gi-sheet max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 pb-8 sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Tu tarjeta</p>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tarjeta de negocios (todo dentro) */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 p-5 text-white shadow-2xl">
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

              {/* Acciones */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition active:scale-[0.98]"
                >
                  Cerrar
                </button>
                <button
                  onClick={share}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
                >
                  <Share2 className="h-4 w-4" /> Compartir
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
        aria-label="Mi tarjeta"
        title="Mi tarjeta"
      >
        <QrCode className="h-5 w-5" />
      </button>
      {sheet}
    </>
  );
}
