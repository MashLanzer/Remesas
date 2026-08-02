"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { confirmVaquitaContribution } from "@/app/actions";

// Botón del operador para confirmar que recibió un aporte.
export function VaquitaConfirmButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => confirmVaquitaContribution(id))}
      disabled={pending}
      className="flex items-center gap-1 rounded-lg border border-income/40 px-2.5 py-1.5 text-xs font-semibold text-income transition active:scale-95 disabled:opacity-50"
    >
      <Check className="h-3.5 w-3.5" /> Confirmar
    </button>
  );
}
