"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

// Botón de corazón para marcar/desmarcar un favorito. Se detiene la
// propagación para no abrir la tarjeta al tocarlo.
export function FavHeart({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={active ? "Quitar de favoritos" : "Añadir a favoritos"}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90",
        active
          ? "bg-rose-500/10 text-rose-500"
          : "bg-muted/70 text-muted-foreground hover:text-rose-500",
        className
      )}
    >
      <Heart className={cn("h-5 w-5", active && "fill-rose-500")} />
    </button>
  );
}
