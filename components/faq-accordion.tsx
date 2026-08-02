"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui";

export type Faq = { q: string; a: string };

export function FaqAccordion({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Card className="divide-y divide-border p-0">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-foreground">{it.q}</span>
              <ChevronDown
                className={
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform " +
                  (isOpen ? "rotate-180" : "")
                }
              />
            </button>
            {isOpen && (
              <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                {it.a}
              </p>
            )}
          </div>
        );
      })}
    </Card>
  );
}
