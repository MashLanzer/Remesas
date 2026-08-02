"use client";

import { Truck, Check, Package, MapPin } from "lucide-react";
import { useT } from "@/components/lang-provider";

// Mapa de seguimiento propio (SVG, sin tiles externos ni claves, funciona
// offline). Resalta la provincia del beneficiario en una silueta estilizada de
// Cuba y muestra la etapa del reparto. No usa GPS: ubica a nivel de provincia,
// que es el dato real que tenemos del envío.

type Stage = "pendiente" | "en_reparto" | "entregado";

// Posición aproximada de cada provincia en el viewBox (oeste → este). No es
// cartografía exacta: es un mapa estilizado para orientar al cliente.
const POS: Record<string, { x: number; y: number }> = {
  "Pinar del Río": { x: 80, y: 250 },
  Artemisa: { x: 165, y: 232 },
  "La Habana": { x: 205, y: 214 },
  Mayabeque: { x: 240, y: 226 },
  Matanzas: { x: 300, y: 220 },
  Cienfuegos: { x: 372, y: 244 },
  "Villa Clara": { x: 402, y: 210 },
  "Sancti Spíritus": { x: 468, y: 220 },
  "Ciego de Ávila": { x: 532, y: 224 },
  Camagüey: { x: 620, y: 224 },
  "Las Tunas": { x: 700, y: 206 },
  Holguín: { x: 772, y: 182 },
  Granma: { x: 730, y: 246 },
  "Santiago de Cuba": { x: 826, y: 224 },
  Guantánamo: { x: 908, y: 196 },
  "Isla de la Juventud": { x: 225, y: 322 },
};

// Silueta estilizada de la isla (aproximada, no cartográfica).
const CUBA_PATH =
  "M60,258 C120,222 210,214 300,220 C400,226 470,214 560,216 " +
  "C660,218 740,190 824,192 C884,194 936,188 962,208 " +
  "C944,232 884,240 824,236 C724,244 644,250 560,248 " +
  "C460,246 380,254 300,258 C220,262 120,296 74,290 " +
  "C48,286 44,266 60,258 Z";

export function DeliveryMap({
  province,
  stage,
}: {
  province?: string | null;
  stage: Stage;
}) {
  const t = useT();
  const key = (province || "").trim();
  const target = POS[key] ?? { x: 500, y: 224 };
  const known = !!POS[key];

  const stageMeta =
    stage === "entregado"
      ? { Icon: Check, color: "hsl(var(--income))", label: t("Entregado en") }
      : stage === "en_reparto"
      ? { Icon: Truck, color: "hsl(var(--primary))", label: t("En reparto en") }
      : { Icon: Package, color: "hsl(var(--muted-foreground))", label: t("Preparando para") };

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
        <svg
          viewBox="0 0 1000 380"
          className="h-auto w-full"
          role="img"
          aria-label={
            known
              ? `${stageMeta.label} ${key}`
              : t("Destino en Cuba")
          }
        >
          {/* Isla */}
          <path
            d={CUBA_PATH}
            fill="hsl(var(--primary) / 0.12)"
            stroke="hsl(var(--primary) / 0.35)"
            strokeWidth={2}
          />
          {/* Isla de la Juventud */}
          <ellipse
            cx={225}
            cy={322}
            rx={26}
            ry={15}
            fill="hsl(var(--primary) / 0.12)"
            stroke="hsl(var(--primary) / 0.35)"
            strokeWidth={2}
          />

          {/* Puntos de todas las provincias (tenues) */}
          {Object.entries(POS).map(([name, p]) => (
            <circle
              key={name}
              cx={p.x}
              cy={p.y}
              r={known && name === key ? 0 : 5}
              fill="hsl(var(--primary) / 0.3)"
            />
          ))}

          {/* Marcador del destino */}
          <g transform={`translate(${target.x}, ${target.y})`}>
            {stage !== "entregado" && (
              <circle r={26} fill={stageMeta.color} opacity={0.18}>
                <animate
                  attributeName="r"
                  values="16;30;16"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.28;0.05;0.28"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle r={15} fill={stageMeta.color} />
            <circle r={15} fill="none" stroke="white" strokeWidth={2.5} opacity={0.9} />
          </g>
        </svg>
      </div>

      {/* Leyenda de estado */}
      <div className="mt-2 flex items-center justify-center gap-2 text-sm">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ background: `${stageMeta.color}` , color: "white" }}
        >
          <stageMeta.Icon className="h-4 w-4" />
        </span>
        <span className="font-semibold text-foreground">
          {stageMeta.label} {known ? key : t("Cuba")}
        </span>
      </div>
      {!known && key && (
        <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" /> {key}
        </p>
      )}
    </div>
  );
}
