import Link from "next/link";
import { TrendingUp, ChevronRight } from "lucide-react";
import { getRemittances, getBusinessSettings } from "@/lib/data";
import { updateBusinessSettings } from "@/app/actions";
import {
  Card,
  Field,
  Input,
  Select,
  Button,
  PageHeader,
} from "@/components/ui";
import { DELIVERY_CURRENCIES, PAYMENT_METHODS } from "@/lib/types";
import { ThemeSwitch } from "@/components/theme-switch";
import { ExportRemittances } from "@/components/export-remittances";

export const dynamic = "force-dynamic";

const APP_VERSION = "1.0.0";

export default async function AjustesPage() {
  const [remittances, settings] = await Promise.all([
    getRemittances(),
    getBusinessSettings(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" />

      {/* Negocio */}
      <section>
        <SectionTitle>Negocio</SectionTitle>
        <Card>
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

            <Button type="submit" className="w-full">
              Guardar configuración
            </Button>
          </form>
        </Card>
      </section>

      {/* Apariencia */}
      <section>
        <SectionTitle>Apariencia</SectionTitle>
        <Card>
          <ThemeSwitch />
        </Card>
      </section>

      {/* Datos */}
      <section>
        <SectionTitle>Datos</SectionTitle>
        <Card>
          <ExportRemittances remittances={remittances} />
        </Card>
      </section>

      {/* Configuración */}
      <section>
        <SectionTitle>Configuración</SectionTitle>
        <Link href="/tasas" className="block">
          <Card className="flex items-center justify-between transition active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Tasas de cambio
                </p>
                <p className="text-xs text-muted-foreground">
                  Ajusta las tasas del día
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Card>
        </Link>
      </section>

      {/* Info */}
      <section>
        <SectionTitle>Información</SectionTitle>
        <Card className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Versión de la app</p>
          <p className="text-sm font-semibold text-foreground">{APP_VERSION}</p>
        </Card>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}
