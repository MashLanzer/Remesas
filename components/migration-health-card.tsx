"use client";

import { useState } from "react";
import { Database, AlertTriangle, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui";
import type { MissingItem } from "@/lib/migration-health";

// Aviso al operador de qué migraciones (SQL) le faltan correr en Supabase.
export function MigrationHealthCard({ missing }: { missing: MissingItem[] }) {
  const [copied, setCopied] = useState(false);
  if (missing.length === 0) return null;

  // Lista única de migraciones a correr (sin repetir).
  const migrations = Array.from(new Set(missing.map((m) => m.migration))).sort();
  const copyText =
    "Migraciones pendientes en Supabase:\n" +
    migrations
      .map((m) => `- ${m}: supabase/migrations/${m}_*.sql`)
      .join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nada */
    }
  }

  return (
    <Card className="space-y-3 border-warning/30 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            Faltan {migrations.length}{" "}
            {migrations.length === 1 ? "migración" : "migraciones"} por correr
          </p>
          <p className="text-xs text-muted-foreground">
            Estas funciones no guardan datos hasta que corras su SQL en Supabase.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {missing.map((m, i) => (
          <div
            key={`${m.migration}-${i}`}
            className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2"
          >
            <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-xs text-foreground">
              {m.feature}
            </span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {m.migration}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={copy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" /> Lista copiada
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" /> Copiar lista de migraciones
          </>
        )}
      </button>
    </Card>
  );
}
