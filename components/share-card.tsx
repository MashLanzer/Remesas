"use client";

import { useState } from "react";
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

  const title = businessName || name || "Giro";
  const subtitle = businessName && name ? name : "Envíos a Cuba";

  const pays = [
    zelle && { k: "Zelle", v: zelle },
    cashapp && { k: "CashApp", v: cashapp },
    paypal && { k: "PayPal", v: paypal },
  ].filter(Boolean) as { k: string; v: string }[];

  // vCard para el QR: al escanear guarda el contacto con métodos de cobro.
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

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="gi-sheet w-full max-w-md rounded-t-3xl bg-background p-5 sm:rounded-3xl"
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
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                  <PaperPlane className="h-5 w-5 -translate-x-px text-white" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-extrabold leading-tight">
                    {title}
                  </p>
                  <p className="truncate text-xs text-white/85">{subtitle}</p>
                </div>
              </div>

              <div className="flex gap-4 p-5">
                <div className="min-w-0 flex-1 space-y-2.5">
                  {phone && (
                    <div className="flex items-center gap-2 text-sm text-neutral-800">
                      <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="truncate font-medium">{phone}</span>
                    </div>
                  )}
                  {pays.length > 0 ? (
                    <div className="space-y-1.5">
                      {pays.map((p) => (
                        <div
                          key={p.k}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="shrink-0 font-semibold text-neutral-500">
                            {p.k}
                          </span>
                          <span className="truncate text-neutral-800">{p.v}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !phone && (
                      <p className="text-xs text-neutral-400">
                        Añade tu teléfono o métodos de cobro para llenar la tarjeta.
                      </p>
                    )
                  )}
                </div>

                {/* QR */}
                <div className="flex shrink-0 flex-col items-center">
                  <div className="rounded-xl bg-white p-1.5 ring-1 ring-neutral-200">
                    <QRCodeSVG value={vcard} size={104} level="M" />
                  </div>
                  <p className="mt-1 text-center text-[10px] text-neutral-400">
                    Escanéame
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground transition active:scale-[0.98]"
              >
                Cerrar
              </button>
              <button
                onClick={share}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
              >
                <Share2 className="h-4 w-4" /> Compartir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
