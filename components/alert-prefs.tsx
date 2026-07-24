"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

type Cat = { key: string; label: string; operatorOnly?: boolean };

const CATS: Cat[] = [
  { key: "pendientes", label: "Remesas por entregar" },
  { key: "porCobrar", label: "Por cobrar de clientes", operatorOnly: true },
  { key: "saldo", label: "Saldo con Cuba", operatorOnly: true },
  { key: "tasas", label: "Tasas sin actualizar", operatorOnly: true },
  { key: "equipo", label: "Solicitudes de equipo", operatorOnly: true },
  { key: "pedidos", label: "Pedidos nuevos" },
];

function readMuted(): Set<string> {
  if (typeof document === "undefined") return new Set();
  const m = document.cookie.match(/(?:^|;\s*)giro_alert_mute=([^;]*)/);
  const v = m ? decodeURIComponent(m[1]) : "";
  return new Set(v.split(",").filter(Boolean));
}

export function AlertPrefs({ isOperador = true }: { isOperador?: boolean }) {
  const router = useRouter();
  const [muted, setMuted] = useState<Set<string>>(new Set());

  useEffect(() => setMuted(readMuted()), []);

  function toggle(key: string) {
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      document.cookie = `giro_alert_mute=${encodeURIComponent(
        Array.from(next).join(",")
      )}; path=/; max-age=31536000`;
      router.refresh();
      return next;
    });
  }

  const cats = CATS.filter((c) => isOperador || !c.operatorOnly);

  return (
    <Card className="space-y-1 p-0">
      <div className="flex items-center gap-2 border-b border-border p-3.5">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          Qué suma la campanita
        </p>
      </div>
      {cats.map((c) => {
        const on = !muted.has(c.key);
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => toggle(c.key)}
            className="flex w-full items-center justify-between px-3.5 py-2.5"
          >
            <span className="text-sm text-foreground">{c.label}</span>
            <span
              className={cn(
                "relative h-6 w-10 rounded-full transition",
                on ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  on ? "left-[18px]" : "left-0.5"
                )}
              />
            </span>
          </button>
        );
      })}
    </Card>
  );
}
