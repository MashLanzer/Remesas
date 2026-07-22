"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { UserCog, Truck, ArrowLeft, ArrowRight } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";
import { joinOperator } from "@/app/actions";

export function OnboardingView() {
  const [mode, setMode] = useState<"choose" | "join">("choose");
  const [state, joinAction] = useFormState(joinOperator, null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <PaperPlane className="h-8 w-8 -translate-x-0.5" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Bienvenido a Giro
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "choose"
              ? "¿Cómo vas a usar la app?"
              : "Únete al equipo de tu operador"}
          </p>
        </div>

        {mode === "choose" ? (
          <div className="space-y-3">
            {/* Registro de operador deshabilitado por ahora. */}
            <div
              aria-disabled
              className="flex w-full cursor-not-allowed items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left opacity-55"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserCog className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  Soy operador
                </span>
                <span className="block text-xs text-muted-foreground">
                  Registro de negocios cerrado por ahora.
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                No disponible
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMode("join")}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.98] hover:bg-muted"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                <Truck className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  Soy repartidor
                </span>
                <span className="block text-xs text-muted-foreground">
                  Entrego en Cuba. Me uno con el código de mi operador.
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <form action={joinAction} className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <label className="mb-1 block text-sm font-medium text-foreground">
                Código del operador
              </label>
              <input
                name="code"
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="Ej: K7M2QP"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-center text-lg font-bold uppercase tracking-[0.3em] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Pídele el código a tu operador. Quedarás pendiente hasta que te
                acepte.
              </p>
              {state?.error && (
                <p className="mt-2 text-sm font-medium text-destructive">
                  {state.error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition active:scale-[0.98]"
            >
              Unirme
            </button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="flex w-full items-center justify-center gap-1 py-1 text-sm text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
          </form>
        )}

        <form action="/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="w-full text-center text-xs text-muted-foreground"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
