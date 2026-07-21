"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";

// Hoja inferior reutilizable (bottom sheet). Se abre desde abajo, con fondo
// oscuro, bloqueo de scroll y portal al body para que no la atrape ningún
// contenedor con blur/transform.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="gi-sheet max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 pb-8 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-bold text-foreground">{title}</p>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Tarjeta que actúa de disparador de un Sheet (mismo look que las filas de
// Ajustes: icono + título + subtítulo + chevron).
export function SheetTrigger({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="block w-full text-left">
      <Card className="flex items-center justify-between transition active:scale-[0.99]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Card>
    </button>
  );
}
