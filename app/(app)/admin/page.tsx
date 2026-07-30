import { redirect } from "next/navigation";
import {
  ShieldCheck,
  DollarSign,
  Send,
  Users,
  Building2,
  UserRound,
  Clock,
  TrendingUp,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { isSuperAdmin, getAdminData } from "@/lib/admin";
import { AdminBrowser } from "@/components/admin-browser";
import { usd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Candado del servidor: solo el dueño. Cualquier otro ni ve la página.
  if (!(await isSuperAdmin())) redirect("/");

  const data = await getAdminData();

  if (!data.ready) {
    return (
      <div className="space-y-6">
        <PageHeader title="Super-admin" icon={ShieldCheck} />
        <Card className="space-y-2 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-semibold">Falta correr una migración</p>
          </div>
          <p className="text-sm text-muted-foreground">
            El panel necesita las funciones de{" "}
            <span className="font-medium text-foreground">
              supabase/migrations/0047_superadmin.sql
            </span>
            . Córrela en el SQL Editor de Supabase y recarga esta página.
          </p>
        </Card>
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div className="space-y-6">
      <PageHeader title="Super-admin" icon={ShieldCheck} />

      {/* Métricas globales */}
      {m && (
        <section className="space-y-2">
          <SectionTitle>Toda la plataforma</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={DollarSign} tone="income" label="Volumen total" value={usd(m.volume_usd)} />
            <Stat icon={TrendingUp} tone="primary" label="Volumen este mes" value={usd(m.volume_month)} />
            <Stat icon={Send} tone="info" label="Remesas" value={String(m.remesas_total)} />
            <Stat icon={Clock} tone="amber" label="Pendientes" value={String(m.remesas_pending)} />
            <Stat icon={Building2} tone="primary" label="Negocios" value={String(m.businesses)} />
            <Stat icon={Users} tone="info" label="Usuarios" value={String(m.users_total)} />
            <Stat icon={UserRound} tone="amber" label="Clientes" value={String(m.clientes)} />
            <Stat icon={Truck} tone="income" label="Repartidores" value={String(m.repartidores)} />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            {m.remesas_month} remesas este mes · {m.new_users_30d} usuarios nuevos
            (30 días) · {m.clientes_30d} clientes nuevos (30 días)
          </p>
        </section>
      )}

      {/* Negocios */}
      <section className="space-y-2">
        <SectionTitle>Negocios ({data.businesses.length})</SectionTitle>
        <div className="space-y-2">
          {data.businesses.length === 0 && (
            <p className="px-1 py-4 text-center text-sm text-muted-foreground">
              Aún no hay negocios.
            </p>
          )}
          {data.businesses.map((b) => (
            <Card key={b.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {b.business_name || b.full_name || "Negocio"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.email}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm font-bold tabular-nums text-income">
                  {usd(b.volume_usd)}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                <span>{b.remesas} remesas</span>
                <span>{b.repartidores} repartidores</span>
                <span>{b.clientes} clientes</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Usuarios y clientes (con búsqueda y acciones) */}
      <section className="space-y-2">
        <SectionTitle>Usuarios y clientes</SectionTitle>
        <AdminBrowser users={data.users} clients={data.clients} />
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof DollarSign;
  tone: "income" | "primary" | "info" | "amber";
  label: string;
  value: string;
}) {
  const toneCls = {
    income: "bg-income/10 text-income",
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    amber: "bg-warning/10 text-warning",
  }[tone];
  return (
    <Card className="flex items-center gap-3 p-3">
      <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-full " + toneCls}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold tabular-nums text-foreground">
          {value}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
