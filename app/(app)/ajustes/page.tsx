import {
  getRemittances,
  getBusinessSettings,
  getSessionContext,
  getTeam,
  getActivityLog,
  getExchangeRates,
  getRateHistory,
} from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { ThemeSwitch } from "@/components/theme-switch";
import { DataModeSwitch } from "@/components/data-mode-switch";
import { ExportRemittances } from "@/components/export-remittances";
import {
  TeamSheet,
  SettingsSheet,
  ActivitySheet,
  RatesSheet,
} from "@/components/ajustes-sheets";

export const dynamic = "force-dynamic";

const APP_VERSION = "1.0.0";

export default async function AjustesPage() {
  const ctx = await getSessionContext();
  const [remittances, settings, team, activity, rates, history] =
    await Promise.all([
      getRemittances(),
      getBusinessSettings(),
      ctx.isOperador
        ? getTeam()
        : Promise.resolve({ code: null, pending: [], members: [] }),
      getActivityLog(150),
      getExchangeRates(),
      getRateHistory(),
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

      {/* Tasas de cambio */}
      <section>
        <SectionTitle>Tasas de cambio</SectionTitle>
        <RatesSheet rates={rates} history={history} />
      </section>

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
