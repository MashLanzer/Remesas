"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Camera, Check, Loader2 } from "lucide-react";
import { contributeVaquita } from "@/app/actions";

// Formulario público para aportar a una vaquita (sin cuenta).
export function VaquitaContribute({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !(parseFloat(amount) > 0) || busy) return;
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setErr("Adjunta el comprobante de tu pago para poder aportar.");
      return;
    }
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("amount", amount);
    fd.append("proof", f);
    const res = await contributeVaquita(token, fd);
    setBusy(false);
    if (!res.ok) {
      setErr("No se pudo registrar tu aporte. Revisa el comprobante e intenta de nuevo.");
      return;
    }
    if (res.ok) {
      setDone(true);
      setName("");
      setAmount("");
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-income/30 bg-income/10 p-4 text-center">
        <Check className="mx-auto h-8 w-8 text-income" />
        <p className="mt-2 text-sm font-bold text-income">¡Aporte registrado!</p>
        <p className="text-xs text-muted-foreground">
          El negocio confirmará tu pago. ¡Gracias por ayudar!
        </p>
        <button
          onClick={() => setDone(false)}
          className="mt-3 text-xs font-semibold text-primary"
        >
          Hacer otro aporte
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre"
        required
        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary"
      />
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
          $
        </span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          placeholder="Monto que aportas (USD)"
          required
          className="w-full rounded-xl border border-input bg-background py-2.5 pl-7 pr-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          setFileName(e.target.files?.[0]?.name ?? null);
          setErr(null);
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={
          "flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition active:scale-[0.98] " +
          (fileName
            ? "border-income/40 bg-income/10 text-income"
            : "border-primary/40 bg-primary/5 text-primary")
        }
      >
        <Camera className="h-4 w-4" />
        {fileName ? "Comprobante adjunto ✓" : "Adjuntar comprobante (obligatorio)"}
      </button>
      {err && (
        <p className="text-center text-xs font-medium text-destructive">{err}</p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-70"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <HandCoins className="h-4 w-4" /> Aportar
          </>
        )}
      </button>
    </form>
  );
}
