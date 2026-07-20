"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { setClientPaid } from "@/app/actions";

export function ClientPaidToggle({
  id,
  paid: initialPaid,
}: {
  id: string;
  paid: boolean;
}) {
  const [paid, setPaid] = useState(initialPaid);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !paid;
    setPaid(next);
    start(() => setClientPaid(id, next));
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="flex w-full items-center justify-between disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <span
          className={
            "flex h-9 w-9 items-center justify-center rounded-full " +
            (paid ? "bg-income/10 text-income" : "bg-warning/10 text-warning")
          }
        >
          {paid ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
        </span>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Cobro al cliente</p>
          <p className="text-xs text-muted-foreground">
            {paid ? "Ya te pagó" : "Aún te debe"}
          </p>
        </div>
      </div>
      <span
        className={
          "rounded-full px-3 py-1 text-xs font-semibold " +
          (paid ? "bg-income/10 text-income" : "bg-warning/10 text-warning")
        }
      >
        {paid ? "Cobrado" : "Por cobrar"}
      </span>
    </button>
  );
}
