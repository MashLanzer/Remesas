import Link from "next/link";
import { ArrowLeft, LogOut, Send, Wallet, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateClientProfile } from "@/app/actions";
import { getMyOrders, getMyPoints } from "@/lib/data";
import { orderDisplay } from "@/components/order-status-badge";
import { SavedBeneficiaries } from "@/components/saved-beneficiaries";
import { usd } from "@/lib/utils";
import { Card, Field, Input, Button } from "@/components/ui";

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

  const [orders, points] = await Promise.all([getMyOrders(), getMyPoints()]);

  // Mini-stats: envíos entregados y total que llegó a la familia.
  const delivered = orders.filter((o) => {
    const d = orderDisplay(o);
    return d === "entregado" || d === "recibido";
  });
  const totalEnviado = delivered.reduce((s, o) => s + Number(o.amount_usd), 0);

  // Avatar de color propio, mismo criterio que el header.
  const nameForAvatar = p.full_name || user?.email || "?";
  const initial = (p.full_name || user?.email || "?").trim().charAt(0).toUpperCase();
  const seed = nameForAvatar
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;

  return (
    <div className="space-y-5">
      <Link
        href="/c"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>

      {/* Cabecera con avatar de color propio + mini-stats */}
      <div className="flex flex-col items-center pt-1 text-center">
        <span
          style={{
            background: `hsl(${hue} 60% 50% / 0.16)`,
            color: `hsl(${hue} 55% 45%)`,
          }}
          className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-extrabold"
        >
          {initial}
        </span>
        <h1 className="mt-3 text-xl font-bold text-foreground">
          {p.full_name || "Tu perfil"}
        </h1>
        {user?.email && (
          <p className="text-sm text-muted-foreground">{user.email}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat icon={Send} value={String(delivered.length)} label="Envíos" />
        <MiniStat icon={Wallet} value={usd(totalEnviado)} label="Enviado" />
        <MiniStat icon={Star} value={String(points.balance)} label="Puntos" />
      </div>

      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tus datos para los envíos
      </h2>

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

      <SavedBeneficiaries />

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

function MiniStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Send;
  value: string;
  label: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-1 p-3 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className="tabular truncate text-base font-bold text-foreground">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </Card>
  );
}
