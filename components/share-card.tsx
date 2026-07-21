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

  const title = businessName || name || "Giro";
  const subtitle = businessName && name ? name : "Envíos a Cuba";

  const pays = [
    zelle && { k: "Zelle", v: zelle },
    cashapp && { k: "CashApp", v: cashapp },
    paypal && { k: "PayPal", v: paypal },
  ].filter(Boolean) as { k: string; v: string }[];

  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name || title}`,
    businessName ? `ORG:${businessName}` : "",
    phone ? `TEL;TYPE=CELL:${phone}` : "",
    pays.length ? `NOTE:${pays.map((p) => `${p.k}: ${p.v}`).join(" · ")}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  function buildText() {
    const lines: string[] = [`📇 ${title}`];
    if (businessName && name) lines.push(name);
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
        await navigator.share({ title, text });
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

              {/* Tarjeta de negocio */}
              <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5">
                <div className="hero-gradient flex items-center gap-3 p-5 text-white">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                    <PaperPlane className="h-6 w-6 -translate-x-px text-white" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-extrabold leading-tight">
                      {title}
                    </p>
                    <p className="truncate text-sm text-white/85">{subtitle}</p>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {phone && (
                    <div className="flex items-center gap-2 text-[15px] font-medium text-neutral-800">
                      <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="break-all">{phone}</span>
                    </div>
                  )}

                  {pays.length > 0 && (
                    <div className="space-y-2 border-t border-neutral-100 pt-3">
                      {pays.map((p) => (
                        <div key={p.k} className="flex items-baseline gap-3">
                          <span className="w-16 shrink-0 text-sm font-semibold text-neutral-500">
                            {p.k}
                          </span>
                          <span className="min-w-0 flex-1 break-all text-sm text-neutral-800">
                            {p.v}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!phone && pays.length === 0 && (
                    <p className="text-sm text-neutral-400">
                      Añade tu teléfono y métodos de cobro en el perfil para llenar
                      la tarjeta.
                    </p>
                  )}

                  {/* QR centrado */}
                  <div className="flex flex-col items-center border-t border-neutral-100 pt-4">
                    <div className="rounded-xl bg-white p-2 ring-1 ring-neutral-200">
                      <QRCodeSVG value={vcard} size={140} level="M" />
                    </div>
                    <p className="mt-2 text-center text-xs text-neutral-400">
                      Escanéame para guardar el contacto
                    </p>
                  </div>
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
