"use client";

import { useEffect, useState, useCallback } from "react";
import { Delete, Lock } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";
import { PIN_KEY, PIN_SESSION, hashPin } from "@/lib/pin";

// Overlay de bloqueo: si hay PIN activo y la sesión no está desbloqueada, cubre
// la app y pide el PIN. Se monta en el layout del cliente.
export function PinLock() {
  const [locked, setLocked] = useState(false);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const hasPin = !!localStorage.getItem(PIN_KEY);
      const unlocked = sessionStorage.getItem(PIN_SESSION) === "1";
      setLocked(hasPin && !unlocked);
    } catch {
      /* nada */
    }
  }, []);

  const submit = useCallback(async (code: string) => {
    const stored = localStorage.getItem(PIN_KEY);
    if (stored && (await hashPin(code)) === stored) {
      try {
        sessionStorage.setItem(PIN_SESSION, "1");
      } catch {
        /* nada */
      }
      setLocked(false);
      setEntry("");
    } else {
      setError(true);
      setTimeout(() => {
        setError(false);
        setEntry("");
      }, 500);
    }
  }, []);

  function press(d: string) {
    if (entry.length >= 4) return;
    const next = entry + d;
    setEntry(next);
    if (next.length === 4) submit(next);
  }
  function back() {
    setEntry((e) => e.slice(0, -1));
  }

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-8">
      <div className="flex flex-col items-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Lock className="h-7 w-7" />
        </span>
        <p className="mt-4 flex items-center gap-1.5 text-lg font-bold text-foreground">
          <PaperPlane className="h-4 w-4 text-primary" /> Ingresa tu PIN
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Para proteger tus envíos
        </p>

        {/* Puntos */}
        <div className={"mt-6 flex gap-3 " + (error ? "animate-pulse" : "")}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={
                "h-3.5 w-3.5 rounded-full border-2 transition " +
                (error
                  ? "border-destructive bg-destructive"
                  : i < entry.length
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40")
              }
            />
          ))}
        </div>
      </div>

      {/* Teclado */}
      <div className="mt-8 grid w-full max-w-[260px] grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <PadButton key={d} onClick={() => press(d)}>
            {d}
          </PadButton>
        ))}
        <span />
        <PadButton onClick={() => press("0")}>0</PadButton>
        <PadButton onClick={back} aria-label="Borrar">
          <Delete className="h-5 w-5" />
        </PadButton>
      </div>
    </div>
  );
}

function PadButton({
  children,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-16 items-center justify-center rounded-2xl bg-muted text-2xl font-semibold text-foreground transition active:scale-95 active:bg-primary/10"
      {...rest}
    >
      {children}
    </button>
  );
}
