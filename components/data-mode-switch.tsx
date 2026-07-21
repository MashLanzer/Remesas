"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { setDataModeCookie } from "@/app/actions";

export function DataModeSwitch() {
  const [saver, setSaver] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSaver(document.documentElement.classList.contains("data-saver"));
  }, []);

  function toggle() {
    const next = !saver;
    setSaver(next);
    document.documentElement.classList.toggle("data-saver", next);
    const val = next ? "low" : "normal";
    try {
      document.cookie = `datamode=${val}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    setDataModeCookie(next);
    // Recargar para que la navegación deje de precargar en segundo plano.
    setTimeout(() => window.location.reload(), 250);
  }

  const on = mounted && saver;

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center justify-between"
      aria-label="Ahorro de datos"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
          <Gauge className="h-5 w-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Ahorro de datos</p>
          <p className="text-xs text-muted-foreground">
            {on ? "Activado · usa menos internet" : "Uso normal"}
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
