import Link from "next/link";
import { User, ChevronRight, Settings, ShieldCheck } from "lucide-react";
import { isSuperAdmin } from "@/lib/admin";
import {
  getRemittances,
  getBusinessSettings,
  getSessionContext,
  getTeam,
  getActivityLog,
  getClients,
  getBeneficiaries,
} from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { getMigrationHealth } from "@/lib/migration-health";
import { MigrationHealthCard } from "@/components/migration-health-card";
import { getOperatorReviewStats } from "@/lib/data";
import { OperatorReviewsCard } from "@/components/operator-reviews-card";
import {
  TeamSheet,
  SettingsSheet,
  ActivitySheet,
} from "@/components/ajustes-sheets";
import {
  PreferencesSheet,
  SecuritySheet,
  DataSheet,
} from "@/components/ajustes-extra-sheets";

export const dynamic = "force-dynamic";

const APP_VERSION = "1.0.0";

export default async function AjustesPage() {
  const ctx = await getSessionContext();
  const [remittances, settings, team, activity, clients, beneficiaries, health] =
    await Promise.all([
      getRemittances(),
      getBusinessSettings(),
      ctx.isOperador
        ? getTeam()
        : Promise.resolve({ code: null, pending: [], members: [] }),
      getActivityLog(150),
      getClients(),
      getBeneficiaries(),
      getMigrationHealth(),
    ]);
  const reviewStats = ctx.isOperador ? await getOperatorReviewStats() : null;
  const superAdmin = await isSuperAdmin();

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" icon={Settings} />

      {/* Panel de super-admin (solo el dueño lo ve) */}
      {superAdmin && (
        <Link href="/admin" className="block">
          <Card className="flex items-center justify-between border-primary/25 bg-primary/5 transition active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Panel de super-admin
                </p>
                <p className="text-xs text-muted-foreground">
                  Vista global de todos los negocios y usuarios
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Card>
        </Link>
      )}

      {/* Aviso de migraciones pendientes (solo operador) */}
      <MigrationHealthCard missing={health.missing} />

      {/* Reputación del negocio (solo operador) */}
      {ctx.isOperador && reviewStats && (
        <section>
          <SectionTitle>Opiniones de clientes</SectionTitle>
          <OperatorReviewsCard
            avg={reviewStats.avg}
            total={reviewStats.total}
            recent={reviewStats.recent}
            code={team.code}
          />
        </section>
      )}

      {/* Cuenta */}
      <section>
        <SectionTitle>Cuenta</SectionTitle>
        <Link href="/perfil" className="block">
          <Card className="flex items-center justify-between transition active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
                <User className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Mi perfil</p>
                <p className="text-xs text-muted-foreground">
                  Nombre, teléfono, tu parte y datos de cobro
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Card>
        </Link>
      </section>

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

      {/* App: preferencias y seguridad (todo en hojas) */}
      <section className="space-y-2">
        <SectionTitle>App</SectionTitle>
        <PreferencesSheet isOperador={ctx.isOperador} />
        <SecuritySheet />
      </section>

      {/* Datos y actividad */}
      <section className="space-y-2">
        <SectionTitle>Datos y actividad</SectionTitle>
        <ActivitySheet entries={activity} isOperador={ctx.isOperador} />
        <DataSheet
          remittances={remittances}
          clients={clients}
          beneficiaries={beneficiaries}
        />
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
