"use client";

import { useState } from "react";
import { Eraser, Check } from "lucide-react";
import { useDialog } from "@/components/confirm";

export function ClearLocalData() {
  const { confirm } = useDialog();
  const [done, setDone] = useState(false);

  async function clear() {
    const ok = await confirm({
      title: "Limpiar datos del dispositivo",
      message:
        "Borra plantillas guardadas, recordatorios y preferencias locales de este teléfono. No afecta tus remesas ni la nube.",
      confirmLabel: "Limpiar",
    });
    if (!ok) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("giro_")) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* nada */
    }
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <button
      onClick={clear}
      className="flex w-full items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
          <Eraser className="h-5 w-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">
            Limpiar datos del dispositivo
          </p>
          <p className="text-xs text-muted-foreground">
            Plantillas, recordatorios y preferencias locales
          </p>
        </div>
      </div>
      {done && <Check className="h-5 w-5 text-income" />}
    </button>
  );
}
