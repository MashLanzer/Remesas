"use client";

import { useState, useTransition } from "react";
import { Target, Pencil, Check, X } from "lucide-react";
import { usd } from "@/lib/utils";
import { updatePersonalGoal } from "@/app/actions";

// Meta personal del repartidor: dinero y/o número de entregas, con barra.
export function RepartidorGoal({
  monthShare,
  goal,
  monthDeliveries,
  goalCount,
}: {
  monthShare: number;
  goal: number;
  monthDeliveries: number;
  goalCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal > 0 ? String(goal) : "");
  const [draftCount, setDraftCount] = useState(
    goalCount > 0 ? String(goalCount) : ""
  );
  const [pending, start] = useTransition();

  const pct = goal > 0 ? Math.min((monthShare / goal) * 100, 100) : 0;
  const pctCount =
    goalCount > 0 ? Math.min((monthDeliveries / goalCount) * 100, 100) : 0;

  function save() {
    const v = parseFloat(draft);
    const c = parseInt(draftCount, 10);
    start(() =>
      updatePersonalGoal(
        Number.isFinite(v) ? v : null,
        Number.isFinite(c) ? c : null
      )
    );
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Target className="h-4 w-4 text-primary" /> Tu meta del mes
          </p>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Cancelar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Ganancia ($)
          </label>
          <div className="flex items-center gap-1 rounded-xl border border-input bg-background px-3 py-2">
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
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Número de entregas
          </label>
          <input
            inputMode="numeric"
            value={draftCount}
            onChange={(e) => setDraftCount(e.target.value)}
            placeholder="Ej: 40"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Guardar meta
        </button>
        <p className="text-[11px] text-muted-foreground">
          Es solo tuya, para motivarte. Deja un campo vacío para quitarlo.
        </p>
      </div>
    );
  }

  // Sin ninguna meta: invitación.
  if (goal <= 0 && goalCount <= 0) {
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
            En dinero o en número de entregas. Sigue tu avance.
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Target className="h-4 w-4 text-primary" /> Tu meta del mes
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft(goal > 0 ? String(goal) : "");
            setDraftCount(goalCount > 0 ? String(goalCount) : "");
            setEditing(true);
          }}
          aria-label="Editar meta"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-90"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {goal > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Ganancia
            </span>
            <span className="tabular text-xs font-medium text-muted-foreground">
              {usd(monthShare)} de {usd(goal)}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {monthShare >= goal
              ? "¡Meta de $ alcanzada! 🎉"
              : `${Math.round(pct)}% · faltan ${usd(Math.max(goal - monthShare, 0))}`}
          </p>
        </div>
      )}

      {goalCount > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Entregas
            </span>
            <span className="tabular text-xs font-medium text-muted-foreground">
              {monthDeliveries} de {goalCount}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-income transition-all"
              style={{ width: `${pctCount}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {monthDeliveries >= goalCount
              ? "¡Meta de entregas alcanzada! 🎉"
              : `${Math.round(pctCount)}% · faltan ${Math.max(
                  goalCount - monthDeliveries,
                  0
                )}`}
          </p>
        </div>
      )}
    </div>
  );
}
