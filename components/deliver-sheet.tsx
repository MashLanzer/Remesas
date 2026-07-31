"use client";

import { useState } from "react";
import { Check, Camera, User, MapPin, IdCard, KeyRound, AlertCircle } from "lucide-react";
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
  const [idPhotoName, setIdPhotoName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [noCode, setNoCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            setError(null);
            fd.set("id", id);
            fd.set("no_code", noCode ? "1" : "0");
            const res = await deliverRemittance(fd);
            setSubmitting(false);
            if (res?.ok) {
              setOpen(false);
              setNoCode(false);
            } else {
              setError(res?.error ?? "No se pudo confirmar la entrega.");
            }
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

          {/* Código de entrega (OTP) */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <KeyRound className="h-4 w-4 text-primary" /> Código de entrega
            </label>
            {noCode ? (
              <div className="mt-2 space-y-2">
                <input
                  name="no_code_reason"
                  placeholder="Motivo (ej. el familiar no tenía el código)"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setNoCode(false);
                    setError(null);
                  }}
                  className="text-xs font-medium text-primary"
                >
                  ← Prefiero pedir el código
                </button>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  name="delivery_code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  placeholder="0000"
                  className="w-full rounded-xl border border-input bg-background px-3 py-3 text-center text-2xl font-bold tracking-[0.5em] text-foreground outline-none focus:border-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Pídele a quien recibe los 4 dígitos que le pasó el remitente.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNoCode(true);
                    setError(null);
                  }}
                  className="text-xs font-medium text-muted-foreground underline underline-offset-2"
                >
                  Entregar sin código
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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

          {/* Foto del carné (opcional) */}
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 transition active:scale-[0.99]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-info/10 text-info">
              <IdCard className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">
                {idPhotoName ? "Carné añadido" : "Foto del carné (opcional)"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {idPhotoName || "Documento de quien recibe"}
              </span>
            </span>
            <input
              type="file"
              name="id_photo"
              accept="image/*"
              className="hidden"
              onChange={(e) => setIdPhotoName(e.target.files?.[0]?.name ?? null)}
            />
          </label>

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
