"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { setThemeCookie } from "@/app/actions";

export function ThemeSwitch() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    const val = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", val);
    } catch {}
    try {
      document.cookie = `theme=${val}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    // Persistencia fiable en el APK: el servidor fija la cookie por Set-Cookie.
    setThemeCookie(next);
  }

  const on = mounted && dark;

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center justify-between"
      aria-label="Modo oscuro"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
          <Moon className="h-5 w-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Modo oscuro</p>
          <p className="text-xs text-muted-foreground">
            {on ? "Activado" : "Desactivado"}
          </p>
        </div>
      </div>
      <span
        className={
          "relative h-6 w-11 shrink-0 rounded-full transition " +
          (on ? "bg-primary" : "bg-muted")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " +
            (on ? "left-[22px]" : "left-0.5")
          }
        />
      </span>
    </button>
  );
}
