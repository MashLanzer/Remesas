"use client";

import { useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { confirmReceived } from "@/app/actions";

export function ConfirmReceivedButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => confirmReceived(token))}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-income py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
    >
      <CheckCircle2 className="h-4 w-4" />
      {pending ? "Confirmando…" : "Ya recibí ✅"}
    </button>
  );
}
