"use client";

import { useMemo, useState } from "react";
import {
  Send,
  Trash2,
  CheckCircle2,
  DollarSign,
  Wallet,
  UserPlus,
  Truck,
  UserCheck,
  UserMinus,
  Store,
  RefreshCw,
  Activity,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { IlluOrders } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/data";

const CATEGORIES = [
  { key: "remesa", label: "Remesas" },
  { key: "pago", label: "Pagos" },
  { key: "cliente", label: "Contactos" },
  { key: "contacto", label: "Contactos", hidden: true },
  { key: "repartidor", label: "Equipo" },
  { key: "oferta", label: "Promos" },
  { key: "pedido", label: "Pedidos" },
];

type Meta = { label: string; icon: LucideIcon; tone: string };

function meta(e: ActivityEntry): Meta {
  const status = (e.details?.status as string) || "";
  switch (e.action) {
    case "remesa.crear":
      return { label: "creó una remesa", icon: Send, tone: "text-primary bg-primary/10" };
    case "remesa.estado":
      return {
        label:
          status === "entregado"
            ? "marcó entregada una remesa"
            : status === "liquidado"
            ? "liquidó una remesa"
            : "cambió el estado de una remesa",
        icon: CheckCircle2,
        tone: "text-income bg-income/10",
      };
    case "remesa.cobrada":
      return { label: "marcó cobrada una remesa", icon: DollarSign, tone: "text-income bg-income/10" };
    case "remesa.por_cobrar":
      return { label: "marcó por cobrar una remesa", icon: DollarSign, tone: "text-warning bg-warning/10" };
    case "remesa.borrar":
      return { label: "borró una remesa", icon: Trash2, tone: "text-destructive bg-destructive/10" };
    case "pago.crear":
      return { label: "registró un pago", icon: Wallet, tone: "text-info bg-info/10" };
    case "cliente.crear":
    case "contacto.crear":
      return { label: "añadió un contacto", icon: UserPlus, tone: "text-primary bg-primary/10" };
    case "repartidor.solicitud":
      return { label: "pidió unirse al equipo", icon: Truck, tone: "text-warning bg-warning/10" };
    case "repartidor.aceptar":
      return { label: "aceptó a un repartidor", icon: UserCheck, tone: "text-income bg-income/10" };
    case "repartidor.quitar":
      return { label: "quitó a un repartidor", icon: UserMinus, tone: "text-destructive bg-destructive/10" };
    case "negocio.crear":
      return { label: "creó el negocio", icon: Store, tone: "text-primary bg-primary/10" };
    case "equipo.codigo":
      return { label: "regeneró el código", icon: RefreshCw, tone: "text-muted-foreground bg-muted" };
    default:
      return { label: e.action, icon: Activity, tone: "text-muted-foreground bg-muted" };
  }
}

function when(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 60000); // minutos
  if (diff < 1) return "ahora";
  if (diff < 60) return `hace ${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `hace ${h} h`;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityList({
  entries,
  isOperador,
}: {
  entries: ActivityEntry[];
  isOperador: boolean;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  // Categorías presentes en el registro (por prefijo de la acción).
  const presentCats = useMemo(() => {
    const present = new Set(
      entries.map((e) => (e.action.split(".")[0] || "").toLowerCase())
    );
    return CATEGORIES.filter((c) => !c.hidden && present.has(c.key));
  }, [entries]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (cat && !e.action.startsWith(cat)) return false;
      if (!t) return true;
      const hay = `${meta(e).label} ${e.actor_name ?? ""} ${
        e.entity_label ?? ""
      }`.toLowerCase();
      return hay.includes(t);
    });
  }, [entries, q, cat]);

  if (entries.length === 0) {
    return (
      <EmptyState
        illustration={<IlluOrders />}
        title="Sin actividad todavía"
        description="Aquí aparece cada acción: remesas, cobros, pagos y cambios del equipo."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en la actividad"
          className="w-full bg-transparent text-sm text-foreground outline-none"
        />
      </div>
      {presentCats.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={!cat} onClick={() => setCat("")} label="Todo" />
          {presentCats.map((c) => (
            <Chip
              key={c.key}
              active={cat === c.key}
              onClick={() => setCat(c.key)}
              label={c.label}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sin resultados.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const m = meta(e);
            const Icon = m.icon;
            const who = isOperador ? e.actor_name || "Alguien" : "Tú";
            return (
              <Card key={e.id} className="flex items-start gap-3 p-3.5">
            <span
              className={
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                m.tone
              }
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{who}</span> {m.label}
                {e.entity_label ? (
                  <span className="text-muted-foreground"> · {e.entity_label}</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">{when(e.created_at)}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground"
      )}
    >
      {label}
    </button>
  );
}
