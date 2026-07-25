"use client";

import { useState, useTransition } from "react";
import { Fuel, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui";
import { addDeliveryExpense, deleteDeliveryExpense } from "@/app/actions";
import { usd } from "@/lib/utils";
import { useDialog } from "@/components/confirm";
import type { DeliveryExpense } from "@/lib/data";

// Gastos de reparto: registro simple + ganancia neta (ganancia − gastos).
export function DeliveryExpenses({
  expenses,
  earned,
}: {
  expenses: DeliveryExpense[];
  earned: number;
}) {
  const { confirm } = useDialog();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const net = earned - total;

  async function remove(id: string) {
    const ok = await confirm({
      title: "Borrar gasto",
      message: "¿Quitar este gasto de reparto?",
      confirmLabel: "Borrar",
    });
    if (ok) start(() => deleteDeliveryExpense(id));
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Fuel className="h-4 w-4" /> Gastos de reparto
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-primary transition active:scale-95"
        >
          {open ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {open ? "Cerrar" : "Añadir"}
        </button>
      </div>

      {/* Ganancia neta */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="tabular text-base font-bold text-income">
              {usd(earned)}
            </p>
            <p className="text-[10px] text-muted-foreground">Ganancia</p>
          </div>
          <div>
            <p className="tabular text-base font-bold text-destructive">
              −{usd(total)}
            </p>
            <p className="text-[10px] text-muted-foreground">Gastos</p>
          </div>
          <div>
            <p className="tabular text-base font-extrabold text-foreground">
              {usd(net)}
            </p>
            <p className="text-[10px] text-muted-foreground">Neto</p>
          </div>
        </div>
      </Card>

      {open && (
        <Card className="p-3">
          <form
            action={async (fd) => {
              await addDeliveryExpense(fd);
              setOpen(false);
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Monto (USD)
              </label>
              <div className="flex items-center gap-1 rounded-xl border border-input bg-background px-3 py-2">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  name="amount"
                  inputMode="decimal"
                  required
                  placeholder="0"
                  className="w-full bg-transparent text-sm text-foreground outline-none"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Nota
              </label>
              <input
                name="note"
                placeholder="Ej: gasolina"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
            </div>
            <button
              type="submit"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition active:scale-90"
              aria-label="Guardar gasto"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </Card>
      )}

      {expenses.length > 0 && (
        <div className="space-y-2">
          {expenses.slice(0, 8).map((e) => (
            <Card
              key={e.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="tabular text-sm font-semibold text-foreground">
                  −{usd(Number(e.amount))}
                  {e.note ? (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {e.note}
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(e.date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(e.id)}
                disabled={pending}
                aria-label="Borrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-destructive transition hover:bg-destructive/10 active:scale-90 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
