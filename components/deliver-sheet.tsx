"use client";

import { useState } from "react";
import { Check, Camera, User, MapPin } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui";
import { SignaturePad } from "@/components/signature-pad";
import { deliverRemittance } from "@/app/actions";

// Confirmación de entrega pulida para el repartidor: resumen (a quién, cuánto)
// + foto de comprobante opcional. Reemplaza el botón seco de "Entregar".
export function DeliverSheet({
  id,
  beneficiaryName,
  province,
  amountUsd,
  delivered,
}: {
  id: string;
  beneficiaryName: string | null;
  province: string | null;
  amountUsd: string;
  delivered: string;
}) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-income px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-income/30 transition active:scale-[0.98]"
      >
        <Check className="h-5 w-5" /> Marcar como entregada
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Confirmar entrega">
        <form
          action={async (fd) => {
            setSubmitting(true);
            fd.set("id", id);
            await deliverRemittance(fd);
            setOpen(false);
          }}
          className="space-y-4"
        >
          {/* Resumen */}
          <div className="space-y-2 rounded-2xl border border-income/20 bg-income/5 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" /> Entregas a
              </span>
              <span className="text-sm font-semibold text-foreground">
                {beneficiaryName || "la familia"}
              </span>
            </div>
            {province && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> Provincia
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {province}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-income/20 pt-2">
              <span className="text-sm text-muted-foreground">Recibe</span>
              <span className="tabular text-lg font-extrabold text-income">
                {delivered}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Equivale a {amountUsd} enviados.
            </p>
          </div>

          {/* Recibido por (opcional) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Recibido por
              </label>
              <input
                name="received_by_name"
                placeholder="Nombre"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Carné (CI)
              </label>
              <input
                name="received_by_id"
                inputMode="numeric"
                placeholder="Opcional"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
            </div>
          </div>

          {/* Firma de recepción (opcional) */}
          <SignaturePad name="signature" />

          {/* Foto de comprobante (opcional) */}
          <div>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 transition active:scale-[0.99]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Camera className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {fileName ? "Foto añadida" : "Añadir foto (opcional)"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {fileName || "Comprobante de que llegó a la familia"}
                </span>
              </span>
              <input
                type="file"
                name="delivery_proof"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setFileName(e.target.files?.[0]?.name ?? null)
                }
              />
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            <Check className="h-4 w-4" /> Confirmar entrega
          </Button>
        </form>
      </Sheet>
    </>
  );
}
