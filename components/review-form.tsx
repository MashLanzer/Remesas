"use client";

import { useState, useTransition } from "react";
import { Star, Check } from "lucide-react";
import { Card } from "@/components/ui";
import { submitReview } from "@/app/actions";
import { cn } from "@/lib/utils";
import { useT } from "@/components/lang-provider";

// Formulario de calificación del cliente para un envío entregado.
export function ReviewForm({
  orderId,
  initialRating = 0,
}: {
  orderId: string;
  initialRating?: number;
}) {
  const tr = useT();
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(initialRating > 0);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    if (rating < 1) return;
    start(() => submitReview(orderId, rating, comment));
    setDone(true);
    setEditing(false);
  }

  if (done && !editing) {
    return (
      <Card className="flex items-center justify-between gap-3 border-income/20 bg-income/5 p-4">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-income" />
          <span className="text-sm font-semibold text-foreground">
            {tr("Gracias por calificar")}
          </span>
          <span className="flex">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted"
                )}
              />
            ))}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-primary"
        >
          {tr("Cambiar")}
        </button>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-bold text-foreground">
        {tr("¿Cómo estuvo tu envío?")}
      </p>
      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            aria-label={`${i} ${tr("estrellas")}`}
            className="transition active:scale-90"
          >
            <Star
              className={cn(
                "h-9 w-9",
                i <= (hover || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted"
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder={tr("Cuéntanos (opcional)…")}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending || rating < 1}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
      >
        {tr("Enviar calificación")}
      </button>
    </Card>
  );
}
