"use client";

import { useState } from "react";
import { Megaphone, ChevronRight } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { Card } from "@/components/ui";
import { AnnouncementsManager } from "@/components/announcements-manager";

// Tarjeta del hub de Gestión que abre "Anuncios a clientes" en una hoja.
// (Antes vivía suelto en Ajustes.)
export function AnunciosHub({
  items,
}: {
  items: React.ComponentProps<typeof AnnouncementsManager>["items"];
}) {
  const [open, setOpen] = useState(false);
  const count = items?.length ?? 0;
  return (
    <>
      <button onClick={() => setOpen(true)} className="block w-full text-left">
        <Card className="flex items-center gap-3 p-4 transition active:scale-[0.99]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Megaphone className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              Anuncios a clientes
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {count > 0
                ? `${count} publicado${count === 1 ? "" : "s"}`
                : "Publica avisos en la app del cliente"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Card>
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Anuncios a clientes"
      >
        <AnnouncementsManager items={items} />
      </Sheet>
    </>
  );
}
