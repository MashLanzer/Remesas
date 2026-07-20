import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/app/actions";
import { Card, Field, Input, Button, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  const displayName = profile?.full_name || user?.email || "?";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" />

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">
              {profile?.full_name || "Sin nombre"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>

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
          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Card>
    </div>
  );
}
