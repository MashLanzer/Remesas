import Link from "next/link";
import { LogOut, TrendingUp, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRemittances } from "@/lib/data";
import { updateProfile } from "@/app/actions";
import { Card, Field, Input, Button, PageHeader } from "@/components/ui";
import { ThemeSwitch } from "@/components/theme-switch";
import { ExportRemittances } from "@/components/export-remittances";

export const dynamic = "force-dynamic";

const APP_VERSION = "1.0.0";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, remittances] = await Promise.all([
    user
      ? supabase.from("profiles").select("*").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    getRemittances(),
  ]);
  const profile = profileRes.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" />

      {/* Perfil */}
      <section>
        <SectionTitle>Perfil</SectionTitle>
        <Card>
          <form action={updateProfile} className="space-y-3">
            <Field label="Nombre">
              <Input
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                placeholder="Tu nombre"
              />
            </Field>
            <Field
              label="Mi % de ganancia por defecto"
              hint="Se usa al crear una remesa nueva. Editable en cada envío."
            >
              <Input
                type="number"
                name="default_split_percent"
                min="0"
                max="100"
                defaultValue={String(profile?.default_split_percent ?? 50)}
              />
            </Field>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
            <Button type="submit" className="w-full">
              Guardar
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
        <Link href="/tasas">
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

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="secondary" className="w-full">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </form>
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
