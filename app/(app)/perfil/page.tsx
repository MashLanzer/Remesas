import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRemittances, getBusinessSettings } from "@/lib/data";
import { updateProfile } from "@/app/actions";
import { Card, Field, Input, Button, PageHeader } from "@/components/ui";
import { ShareCard } from "@/components/share-card";
import { PaymentMethods } from "@/components/payment-methods";
import { usd, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, remittances, settings] = await Promise.all([
    user
      ? supabase.from("profiles").select("*").eq("id", user.id).single()
      : Promise.resolve({ data: null as Record<string, unknown> | null }),
    getRemittances(),
    getBusinessSettings(),
  ]);

  const p = (profile ?? {}) as Record<string, string | number | null>;
  const displayName = (p.full_name as string) || user?.email || "?";
  const initial = displayName.charAt(0).toUpperCase();
  const avatarUrl = (p.avatar_url as string) || null;
  const businessName = settings.business_name || null;

  const myProfit = remittances.reduce((s, r) => s + Number(r.my_share), 0);
  const count = remittances.length;
  const since = (p.created_at as string) || null;

  // Este mes y ticket promedio.
  const now = new Date();
  const monthProfit = remittances
    .filter((r) => {
      const d = new Date(r.date + "T00:00:00");
      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      );
    })
    .reduce((s, r) => s + Number(r.my_share), 0);
  const avgTicket = count
    ? remittances.reduce((s, r) => s + Number(r.amount_usd), 0) / count
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" />

      {/* Cabecera */}
      <Card>
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {initial}
            </span>
          )}
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
        <Stat label="Este mes" value={usd(monthProfit)} />
        <Stat label="Remesas" value={String(count)} />
        <Stat label="Promedio" value={usd(avgTicket)} />
        <Stat label="Desde" value={since ? formatDate(since) : "—"} />
      </div>

      {/* Tarjeta y datos de cobro */}
      <section className="space-y-2">
        <SectionTitle>Tu tarjeta y cobro</SectionTitle>
        <ShareCard
          name={(p.full_name as string) ?? null}
          businessName={businessName}
          phone={(p.phone as string) ?? null}
          zelle={(p.zelle as string) ?? null}
          cashapp={(p.cashapp as string) ?? null}
          paypal={(p.paypal as string) ?? null}
        />
        <PaymentMethods
          name={(p.full_name as string) ?? null}
          brand={businessName}
          phone={(p.phone as string) ?? null}
          zelle={(p.zelle as string) ?? null}
          cashapp={(p.cashapp as string) ?? null}
          paypal={(p.paypal as string) ?? null}
        />
      </section>

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

          <Field
            label="Foto de perfil (opcional)"
            hint={avatarUrl ? "Sube otra para reemplazarla." : "Se ve en tu perfil."}
          >
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono / WhatsApp">
              <Input
                name="phone"
                inputMode="tel"
                defaultValue={(p.phone as string) ?? ""}
                placeholder="+1 305 000 0000"
              />
            </Field>
            <Field label="Mi % ganancia" hint="Editable en cada envío.">
              <Input
                type="number"
                name="default_split_percent"
                min="0"
                max="100"
                defaultValue={String((p.default_split_percent as number) ?? 50)}
              />
            </Field>
          </div>

          <p className="pt-1 text-xs font-medium text-muted-foreground">
            Métodos de cobro (para copiar rápido al cliente)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Zelle">
              <Input
                name="zelle"
                defaultValue={(p.zelle as string) ?? ""}
                placeholder="Correo o teléfono"
              />
            </Field>
            <Field label="CashApp">
              <Input
                name="cashapp"
                defaultValue={(p.cashapp as string) ?? ""}
                placeholder="$tu-cashtag"
              />
            </Field>
          </div>
          <Field label="PayPal">
            <Input
              name="paypal"
              defaultValue={(p.paypal as string) ?? ""}
              placeholder="Correo de PayPal"
            />
          </Field>

          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Card>

      {/* Cerrar sesión */}
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
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
