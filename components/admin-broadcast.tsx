"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Megaphone } from "lucide-react";
import { Card } from "@/components/ui";
import { adminBroadcast } from "@/app/actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
    >
      <Megaphone className="h-4 w-4" />
      {pending ? "Enviando…" : "Enviar a todos"}
    </button>
  );
}

export function AdminBroadcast({ businesses }: { businesses: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Publica un aviso que verán los clientes de{" "}
        <span className="font-medium text-foreground">
          {businesses} negocio{businesses === 1 ? "" : "s"}
        </span>{" "}
        en el inicio de su app.
      </p>
      <form
        ref={formRef}
        action={async (fd) => {
          await adminBroadcast(fd);
          formRef.current?.reset();
          setConfirming(false);
        }}
        className="space-y-2.5"
      >
        <div className="flex gap-2">
          <input
            name="emoji"
            maxLength={2}
            placeholder="📣"
            className="w-14 rounded-xl border border-input bg-background px-3 py-2.5 text-center text-sm outline-none focus:border-ring"
          />
          <input
            name="title"
            required
            placeholder="Título del anuncio"
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <textarea
          name="body"
          rows={2}
          placeholder="Mensaje (opcional)"
          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
        {confirming ? (
          <div className="flex items-center gap-2">
            <SubmitBtn />
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition active:scale-95"
            >
              Cancelar
            </button>
            <span className="text-xs text-warning">Se enviará a todos.</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition active:scale-[0.98]"
          >
            <Megaphone className="h-4 w-4" /> Preparar anuncio global
          </button>
        )}
      </form>
    </Card>
  );
}
