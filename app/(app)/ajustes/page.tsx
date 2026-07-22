import {
  getRemittances,
  getBusinessSettings,
  getSessionContext,
  getTeam,
  getActivityLog,
} from "@/lib/data";
import Link from "next/link";
import { Megaphone, ShoppingBag, ChevronRight } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { ThemeSwitch } from "@/components/theme-switch";
import { DataModeSwitch } from "@/components/data-mode-switch";
import { ExportRemittances } from "@/components/export-remittances";
import {
  TeamSheet,
  SettingsSheet,
  ActivitySheet,
} from "@/components/ajustes-sheets";

export const dynamic = "force-dynamic";

const APP_VERSION = "1.0.0";

export default async function AjustesPage() {
  const ctx = await getSessionContext();
  const [remittances, settings, team, activity] = await Promise.all([
    getRemittances(),
    getBusinessSettings(),
    ctx.isOperador
      ? getTeam()
      : Promise.resolve({ code: null, pending: [], members: [] }),
    getActivityLog(150),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" />

      {/* Equipo (solo operador) */}
      {ctx.isOperador && (
        <section>
          <SectionTitle>Equipo</SectionTitle>
          <TeamSheet team={team} />
        </section>
      )}

      {/* Negocio (solo operador) */}
      {ctx.isOperador && (
        <section>
          <SectionTitle>Negocio</SectionTitle>
          <SettingsSheet settings={settings} />
        </section>
      )}

      {/* Ofertas (solo operador) */}
      {ctx.isOperador && (
        <section>
          <SectionTitle>Ofertas</SectionTitle>
          <Link href="/ofertas" className="block">
            <Card className="flex items-center justify-between transition active:scale-[0.99]">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
                  <Megaphone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Ofertas para clientes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Publica promociones y tasas especiales
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>
        </section>
      )}

      {/* Tienda (solo operador) */}
      {ctx.isOperador && (
        <section>
          <SectionTitle>Tienda</SectionTitle>
          <Link href="/productos" className="block">
            <Card className="flex items-center justify-between transition active:scale-[0.99]">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Productos</p>
                  <p className="text-xs text-muted-foreground">
                    Combos, recargas y más para tus clientes
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
          </Link>
        </section>
      )}

      {/* Apariencia */}
      <section>
        <SectionTitle>Apariencia</SectionTitle>
        <Card>
          <ThemeSwitch />
        </Card>
      </section>

      {/* Conexión */}
      <section>
        <SectionTitle>Conexión</SectionTitle>
        <Card className="space-y-3">
          <DataModeSwitch />
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            Ideal si tienes internet lento o pocos datos. No descarga las fotos
            de comprobantes hasta que las toques y evita cargar pantallas en
            segundo plano. Se guarda solo en este teléfono.
          </p>
        </Card>
      </section>

      {/* Actividad */}
      <section>
        <SectionTitle>Actividad</SectionTitle>
        <ActivitySheet entries={activity} isOperador={ctx.isOperador} />
      </section>

      {/* Datos */}
      <section>
        <SectionTitle>Datos</SectionTitle>
        <Card>
          <ExportRemittances remittances={remittances} />
        </Card>
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
