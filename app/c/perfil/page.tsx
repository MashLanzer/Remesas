import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateClientProfile } from "@/app/actions";
import { Card, Field, Input, Button, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClientePerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single()
    : { data: null };

  const p = (profile ?? {}) as { full_name?: string | null; phone?: string | null };

  return (
    <div className="space-y-5">
      <Link
        href="/c"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>

      <PageHeader title="Mi perfil" subtitle="Tus datos para los envíos" />

      <Card>
        <form action={updateClientProfile} className="space-y-3">
          <Field label="Nombre">
            <Input
              name="full_name"
              defaultValue={p.full_name ?? ""}
              placeholder="Tu nombre"
            />
          </Field>
          <Field
            label="Teléfono / WhatsApp"
            hint="El negocio te contactará por aquí."
          >
            <Input
              name="phone"
              inputMode="tel"
              defaultValue={p.phone ?? ""}
              placeholder="+1 305 000 0000"
            />
          </Field>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Card>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive transition active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </form>
    </div>
  );
}
