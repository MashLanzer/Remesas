"use client";

import { useState, useTransition } from "react";
import { Upload, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui";
import { importRates } from "@/app/actions";
import { cn } from "@/lib/utils";

export function RateImport() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-sm font-semibold text-foreground"
      >
        <Upload className="h-4 w-4 text-primary" />
        Importar tasas del día
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 text-muted-foreground transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <form
          action={(fd) =>
            start(async () => {
              await importRates(fd);
              setOpen(false);
            })
          }
          className="space-y-2 border-t border-border p-3.5"
        >
          <p className="text-xs text-muted-foreground">
            Pega las tasas, una por línea o separadas por comas. Reconoce el
            código de moneda y el número.
          </p>
          <textarea
            name="raw"
            rows={4}
            placeholder={"CUP 440\nMLC 260\nEUR 0.92"}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Aplicando…" : "Aplicar tasas"}
          </button>
        </form>
      )}
    </Card>
  );
}
