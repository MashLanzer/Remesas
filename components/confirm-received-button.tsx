"use client";

import { useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { confirmReceived } from "@/app/actions";
import { useDialog } from "@/components/confirm";

export function ConfirmReceivedButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const { confirm } = useDialog();
  return (
    <button
      onClick={async () => {
        if (
          await confirm({
            title: "Confirmar recepción",
            message: "¿Confirmas que ya recibiste el dinero?",
            confirmLabel: "Sí, recibí",
            destructive: false,
          })
        )
          start(() => confirmReceived(token));
      }}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-income py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
    >
      <CheckCircle2 className="h-4 w-4" />
      {pending ? "Confirmando…" : "Ya recibí ✅"}
    </button>
  );
}
