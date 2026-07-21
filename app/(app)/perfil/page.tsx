import { createClient } from "@/lib/supabase/server";
import { getRemittances } from "@/lib/data";
import { updateProfile } from "@/app/actions";
import { Card, Field, Input, Button, PageHeader } from "@/components/ui";
import { usd, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, remittances] = await Promise.all([
    user
      ? supabase.from("profiles").select("*").eq("id", user.id).single()
      : Promise.resolve({ data: null as Record<string, unknown> | null }),
    getRemittances(),
  ]);

  const p = (profile ?? {}) as Record<string, string | number | null>;
  const displayName = (p.full_name as string) || user?.email || "?";
  const initial = displayName.charAt(0).toUpperCase();

  const myProfit = remittances.reduce((s, r) => s + Number(r.my_share), 0);
  const count = remittances.length;
  const since = (p.created_at as string) || null;

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" />

      {/* Cabecera */}
      <Card>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">
              {(p.full_name as string) || "Sin nombre"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </Card>

      {/* Mini-estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Has ganado" value={usd(myProfit)} />
        <Stat label="Remesas" value={String(count)} />
        <Stat label="Desde" value={since ? formatDate(since) : "—"} />
      </div>

      {/* Datos */}
      <Card>
        <form action={updateProfile} className="space-y-3">
          <Field label="Nombre">
            <Input
              name="full_name"
              defaultValue={(p.full_name as string) ?? ""}
              placeholder="Tu nombre"
            />
          </Field>
          <Field label="Teléfono / WhatsApp">
            <Input
              name="phone"
              inputMode="tel"
              defaultValue={(p.phone as string) ?? ""}
              placeholder="Ej: +1 305 000 0000"
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
              defaultValue={String((p.default_split_percent as number) ?? 50)}
            />
          </Field>

          <p className="pt-1 text-xs font-medium text-muted-foreground">
            Métodos de cobro (para copiar rápido al cliente)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Zelle">
              <Input name="zelle" defaultValue={(p.zelle as string) ?? ""} placeholder="correo/tel" />
            </Field>
            <Field label="CashApp">
              <Input name="cashapp" defaultValue={(p.cashapp as string) ?? ""} placeholder="$tag" />
            </Field>
            <Field label="PayPal">
              <Input name="paypal" defaultValue={(p.paypal as string) ?? ""} placeholder="correo" />
            </Field>
          </div>

          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        Tu tarjeta compartible (con QR) está en el ícono{" "}
        <span className="font-medium text-foreground">⬛ arriba</span>, en la barra
        superior.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-sm font-bold text-foreground">{value}</p>
    </Card>
  );
}
