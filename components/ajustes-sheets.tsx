"use client";

import { useState } from "react";
import { Truck, Store, Activity } from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/sheet";
import { Field, Input, Select, Button } from "@/components/ui";
import { TeamManager } from "@/components/repartidores-manager";
import { ActivityList } from "@/components/activity-list";
import { updateBusinessSettings } from "@/app/actions";
import {
  DELIVERY_CURRENCIES,
  PAYMENT_METHODS,
  type BusinessSettings,
} from "@/lib/types";
import type { ActivityEntry, Team } from "@/lib/data";

// --- Equipo ---
export function TeamSheet({ team }: { team: Team }) {
  const [open, setOpen] = useState(false);
  const pend = team.pending.length;
  return (
    <>
      <SheetTrigger
        icon={Truck}
        title="Mi equipo"
        subtitle={
          pend > 0
            ? `${pend} solicitud${pend > 1 ? "es" : ""} por aceptar`
            : "Código, solicitudes y repartidores"
        }
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title="Mi equipo">
        <TeamManager code={team.code} pending={team.pending} members={team.members} />
      </Sheet>
    </>
  );
}

// --- Negocio (reglas de comisión y datos) ---
export function SettingsSheet({ settings }: { settings: BusinessSettings }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SheetTrigger
        icon={Store}
        title="Negocio"
        subtitle="Comisión, moneda y datos del negocio"
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title="Negocio">
        <form action={updateBusinessSettings} className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Reglas de comisión
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Umbral $">
              <Input
                type="number"
                name="commission_threshold"
                min="0"
                step="0.01"
                defaultValue={String(settings.commission_threshold)}
              />
            </Field>
            <Field label="% si ≥">
              <Input
                type="number"
                name="commission_percent"
                min="0"
                step="0.1"
                defaultValue={String(settings.commission_percent)}
              />
            </Field>
            <Field label="Fijo si <">
              <Input
                type="number"
                name="commission_flat"
                min="0"
                step="0.01"
                defaultValue={String(settings.commission_flat)}
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ej: umbral 100, 10%, fijo 5 → envíos de $100+ cobran 10%, menores
            cobran $5.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Moneda por defecto">
              <Select
                name="default_currency"
                defaultValue={settings.default_currency}
              >
                {DELIVERY_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Método por defecto">
              <Select
                name="default_payment_method"
                defaultValue={settings.default_payment_method ?? ""}
              >
                <option value="">—</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Nombre del negocio">
            <Input
              name="business_name"
              defaultValue={settings.business_name ?? ""}
              placeholder="Opcional"
            />
          </Field>

          <Field
            label="Color de la app del cliente"
            hint="El acento que verán tus clientes."
          >
            <div className="flex flex-wrap gap-2">
              {[
                { h: 150, name: "Verde" },
                { h: 210, name: "Azul" },
                { h: 265, name: "Morado" },
                { h: 330, name: "Rosa" },
                { h: 0, name: "Rojo" },
                { h: 25, name: "Naranja" },
                { h: 180, name: "Turquesa" },
              ].map((c) => {
                const current = settings.brand_hue ?? 150;
                return (
                  <label
                    key={c.h}
                    className="cursor-pointer"
                    title={c.name}
                  >
                    <input
                      type="radio"
                      name="brand_hue"
                      value={c.h}
                      defaultChecked={current === c.h}
                      className="peer sr-only"
                    />
                    <span
                      style={{ background: `hsl(${c.h} 72% 45%)` }}
                      className="block h-8 w-8 rounded-full ring-2 ring-transparent transition peer-checked:ring-foreground peer-checked:ring-offset-2 peer-checked:ring-offset-background"
                    />
                  </label>
                );
              })}
            </div>
          </Field>
          <Field label="Contacto en Cuba">
            <Input
              name="partner_name"
              defaultValue={settings.partner_name ?? ""}
              placeholder="Nombre de tu contacto"
            />
          </Field>
          <Field
            label="Recordar si el saldo pasa de ($)"
            hint="Te avisa en Cuentas y notificaciones. Vacío = sin aviso."
          >
            <Input
              type="number"
              name="settle_threshold"
              min="0"
              step="0.01"
              defaultValue={
                settings.settle_threshold ? String(settings.settle_threshold) : ""
              }
              placeholder="Ej: 500"
            />
          </Field>
          <Field
            label="Meta de ganancia mensual ($)"
            hint="Se muestra en Reportes como barra de progreso. Vacío = sin meta."
          >
            <Input
              type="number"
              name="monthly_goal"
              min="0"
              step="0.01"
              defaultValue={
                settings.monthly_goal ? String(settings.monthly_goal) : ""
              }
              placeholder="Ej: 1000"
            />
          </Field>
          <p className="pt-1 text-xs font-medium text-muted-foreground">
            Puntos de fidelidad (clientes)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Puntos por $1" hint="Al entregar la remesa.">
              <Input
                type="number"
                name="points_per_usd"
                min="0"
                step="0.1"
                defaultValue={
                  settings.points_per_usd != null
                    ? String(settings.points_per_usd)
                    : "1"
                }
                placeholder="1"
              />
            </Field>
            <Field label="Valor de 1 punto ($)" hint="Ej: 0.05 → 100 pts = $5.">
              <Input
                type="number"
                name="point_value_usd"
                min="0"
                step="0.01"
                defaultValue={
                  settings.point_value_usd != null
                    ? String(settings.point_value_usd)
                    : "0.05"
                }
                placeholder="0.05"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mínimo para canjear" hint="Puntos.">
              <Input
                type="number"
                name="redeem_min_points"
                min="0"
                step="1"
                defaultValue={
                  settings.redeem_min_points != null
                    ? String(settings.redeem_min_points)
                    : "100"
                }
                placeholder="100"
              />
            </Field>
            <Field
              label="Tope del descuento (%)"
              hint="Del total de la comisión. La casa conserva el resto."
            >
              <Input
                type="number"
                name="redeem_max_pct"
                min="0"
                max="100"
                step="1"
                defaultValue={
                  settings.redeem_max_pct != null
                    ? String(settings.redeem_max_pct)
                    : "50"
                }
                placeholder="50"
              />
            </Field>
          </div>

          <Button type="submit" className="w-full">
            Guardar configuración
          </Button>
        </form>
      </Sheet>
    </>
  );
}

// --- Actividad ---
export function ActivitySheet({
  entries,
  isOperador,
}: {
  entries: ActivityEntry[];
  isOperador: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SheetTrigger
        icon={Activity}
        title="Registro de actividad"
        subtitle={isOperador ? "Todo lo que hace tu equipo" : "Tu historial"}
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title="Actividad">
        <ActivityList entries={entries} isOperador={isOperador} />
      </Sheet>
    </>
  );
}
