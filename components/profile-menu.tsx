"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut } from "lucide-react";

export function ProfileMenu({ email }: { email?: string | null }) {
  const initial = (email || "?").charAt(0).toUpperCase();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground transition active:scale-95"
        aria-label="Perfil"
        aria-haspopup="menu"
        aria-expanded={open}
        title={email || ""}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Mi cuenta</p>
            {email && (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            )}
          </div>

          <MenuItem
            href="/perfil"
            icon={<User className="h-4 w-4" />}
            label="Perfil"
            onClick={() => setOpen(false)}
          />
          <MenuItem
            href="/ajustes"
            icon={<Settings className="h-4 w-4" />}
            label="Ajustes"
            onClick={() => setOpen(false)}
          />

          <form action="/auth/signout" method="post" className="border-t border-border">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive transition hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </Link>
  );
}
