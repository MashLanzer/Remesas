"use client";

import { useState, useTransition } from "react";
import { Target, Pencil, Check, X } from "lucide-react";
import { usd } from "@/lib/utils";
import { updatePersonalGoal } from "@/app/actions";

// Meta personal del repartidor: barra motivadora en su dashboard + edición.
export function RepartidorGoal({
  monthShare,
  goal,
}: {
  monthShare: number;
  goal: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal > 0 ? String(goal) : "");
  const [pending, start] = useTransition();

  const pct = goal > 0 ? Math.min((monthShare / goal) * 100, 100) : 0;
  const reached = goal > 0 && monthShare >= goal;

  function save() {
    const v = parseFloat(draft);
    start(() => updatePersonalGoal(Number.isFinite(v) ? v : null));
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
          <Target className="h-4 w-4 text-primary" /> Tu meta del mes
        </p>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1 rounded-xl border border-input bg-background px-3 py-2">
            <span className="text-sm text-muted-foreground">$</span>
            <input
              autoFocus
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ej: 300"
              className="w-full bg-transparent text-sm text-foreground outline-none"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            aria-label="Guardar meta"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition active:scale-90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Cancelar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Es solo tuya, para motivarte. Puedes borrarla dejándola vacía.
        </p>
      </div>
    );
  }

  // Sin meta: invitación a ponerse una.
  if (goal <= 0) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-left transition active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Target className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Ponte una meta del mes
          </p>
          <p className="text-xs text-muted-foreground">
            Fija cuánto quieres ganar y sigue tu avance.
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Target className="h-4 w-4 text-primary" /> Tu meta del mes
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft(String(goal));
            setEditing(true);
          }}
          aria-label="Editar meta"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-90"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="tabular text-lg font-extrabold text-foreground">
          {usd(monthShare)}
        </span>
        <span className="tabular text-xs font-medium text-muted-foreground">
          de {usd(goal)}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {reached
          ? "¡Meta alcanzada! 🎉 Sigue sumando."
          : `${Math.round(pct)}% · te faltan ${usd(Math.max(goal - monthShare, 0))}`}
      </p>
    </div>
  );
}
