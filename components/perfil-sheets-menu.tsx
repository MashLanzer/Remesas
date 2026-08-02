"use client";

import { useState, type ReactNode } from "react";
import { User, CreditCard, MapPin, Download, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { Card } from "@/components/ui";

type Which = null | "datos" | "cobro" | "cobertura" | "entregas";

// Menú del perfil del negocio (operador/repartidor): filas que abren cada bloque
// en una hoja, para reducir el scroll. Los contenidos llegan como slots ya
// renderizados desde el servidor (así no importamos componentes de servidor en
// cliente).
export function PerfilSheetsMenu({
  datos,
  cobro,
  cobertura,
  entregas,
}: {
  datos: ReactNode;
  cobro: ReactNode;
  cobertura?: ReactNode;
  entregas?: ReactNode;
}) {
  const [open, setOpen] = useState<Which>(null);
  const close = () => setOpen(null);

  return (
    <div className="space-y-2">
      <Row
        icon={User}
        title="Mis datos"
        subtitle="Nombre, foto, teléfono y % de ganancia"
        onClick={() => setOpen("datos")}
      />
      <Row
        icon={CreditCard}
        title="Tu tarjeta y cobro"
        subtitle="Zelle, CashApp, PayPal y tarjeta para compartir"
        onClick={() => setOpen("cobro")}
      />
      {cobertura && (
        <Row
          icon={MapPin}
          title="Zona de cobertura"
          subtitle="Provincias donde repartes"
          onClick={() => setOpen("cobertura")}
        />
      )}
      {entregas && (
        <Row
          icon={Download}
          title="Exportar mis entregas"
          subtitle="Descarga tu historial"
          onClick={() => setOpen("entregas")}
        />
      )}

      <Sheet open={open === "datos"} onClose={close} title="Mis datos">
        {datos}
      </Sheet>
      <Sheet open={open === "cobro"} onClose={close} title="Tu tarjeta y cobro">
        {cobro}
      </Sheet>
      {cobertura && (
        <Sheet
          open={open === "cobertura"}
          onClose={close}
          title="Zona de cobertura"
        >
          {cobertura}
        </Sheet>
      )}
      {entregas && (
        <Sheet
          open={open === "entregas"}
          onClose={close}
          title="Exportar mis entregas"
        >
          {entregas}
        </Sheet>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="block w-full text-left">
      <Card className="flex items-center justify-between transition active:scale-[0.99]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Card>
    </button>
  );
}
