import Link from "next/link";
import { LogOut, TrendingUp, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/app/actions";
import { Card, Field, Input, Button, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  return (
    <div>
      <PageHeader title="Ajustes" />

      <Card className="mb-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Mi perfil
        </p>
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
          <Button type="submit" className="w-full">Guardar</Button>
        </form>
      </Card>

      <Link href="/tasas">
        <Card className="mb-4 flex items-center justify-between transition hover:border-ring">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Tasas de cambio</p>
              <p className="text-xs text-muted-foreground">Ajusta las tasas del día</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Card>
      </Link>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="secondary" className="w-full">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
