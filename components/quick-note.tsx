"use client";

import { useState, useTransition } from "react";
import { Pencil, StickyNote } from "lucide-react";
import { Card, Button, Textarea } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { updateContactNotes } from "@/app/actions";
import { cn } from "@/lib/utils";

const TAGS = ["VIP", "Preferido", "Moroso", "Paga tarde"];

export function QuickNote({
  kind,
  id,
  notes,
}: {
  kind: "cliente" | "beneficiario";
  id: string;
  notes: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(notes ?? "");
  const [pending, start] = useTransition();

  function toggleTag(tag: string) {
    setVal((v) => {
      if (v.includes(tag)) {
        return v
          .replace(tag, "")
          .replace(/\s*·\s*·\s*/g, " · ")
          .replace(/^\s*·\s*/, "")
          .replace(/\s*·\s*$/, "")
          .trim();
      }
      return v ? `${tag} · ${v}` : tag;
    });
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <StickyNote className="h-3.5 w-3.5" /> Nota
        </p>
        <button
          onClick={() => {
            setVal(notes ?? "");
            setOpen(true);
          }}
          className="flex items-center gap-1 text-xs font-semibold text-primary"
        >
          <Pencil className="h-3.5 w-3.5" /> {notes ? "Editar" : "Añadir"}
        </button>
      </div>
      {notes ? (
        <p className="whitespace-pre-line text-sm text-foreground">{notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sin nota. Añade un recordatorio rápido.
        </p>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Nota rápida">
        <div className="mb-3 flex flex-wrap gap-2">
          {TAGS.map((t) => {
            const active = val.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground"
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
        <Textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={4}
          placeholder="Ej: Prefiere que le avisen por WhatsApp…"
        />
        <Button
          className="mt-3 w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await updateContactNotes(kind, id, val);
              setOpen(false);
            })
          }
        >
          Guardar nota
        </Button>
      </Sheet>
    </Card>
  );
}
