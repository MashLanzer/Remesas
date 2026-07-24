"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { User, LogOut } from "lucide-react";

export function ClienteProfileMenu({
  firstName,
  initial,
  email,
}: {
  firstName?: string | null;
  initial: string;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Color propio derivado del nombre (con alfa, se adapta a claro/oscuro).
  const seed = (firstName || email || "?")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;
  const avatarStyle = {
    background: `hsl(${hue} 60% 50% / 0.16)`,
    color: `hsl(${hue} 55% 45%)`,
  };

  function close() {
    setOpen(false);
    setConfirm(false);
  }

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-muted"
        aria-label="Mi cuenta"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          style={avatarStyle}
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
        >
          {initial}
        </span>
        {firstName && (
          <span className="max-w-[7rem] truncate text-sm font-semibold text-foreground">
            {firstName}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Mi cuenta</p>
            {email && (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            )}
          </div>

          {confirm ? (
            <div className="p-3">
              <p className="px-1 pb-2 text-sm font-medium text-foreground">
                ¿Cerrar sesión?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirm(false)}
                  className="flex-1 rounded-xl border border-border py-2 text-sm font-semibold text-foreground transition active:scale-95"
                >
                  Cancelar
                </button>
                <form action="/auth/signout" method="post" className="flex-1">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-destructive py-2 text-sm font-semibold text-white transition active:scale-95"
                  >
                    Sí, salir
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/c/perfil"
                onClick={close}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <User className="h-4 w-4" /> Mi perfil
              </Link>
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-sm font-medium text-destructive transition hover:bg-muted"
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
