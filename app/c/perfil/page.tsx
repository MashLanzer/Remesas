import Link from "next/link";
import {
  ArrowLeft,
  LogOut,
  Send,
  Wallet,
  Star,
  MessageCircle,
  HelpCircle,
  Check,
  PartyPopper,
  MessageSquareQuote,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateClientProfile } from "@/app/actions";
import { getMyOrders, getMyPoints, getMyOperatorContact } from "@/lib/data";
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
        .select("full_name, phone, avatar_url")
        .eq("id", user.id)
        .single()
    : { data: null };

  const p = (profile ?? {}) as {
    full_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  };

  const [orders, points, contact] = await Promise.all([
    getMyOrders(),
    getMyPoints(),
    getMyOperatorContact(),
  ]);

  const bizDigits = contact.phone?.replace(/\D/g, "") || "";
  const bizWa = bizDigits
    ? `https://wa.me/${bizDigits}?text=${encodeURIComponent(
        `Hola${contact.businessName ? ` ${contact.businessName}` : ""}, tengo una consulta.`
      )}`
    : null;

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

      {/* Cabecera con foto o avatar de color propio + mini-stats */}
      <div className="flex flex-col items-center pt-1 text-center">
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.avatar_url}
            alt="Foto de perfil"
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            style={{
              background: `hsl(${hue} 60% 50% / 0.16)`,
              color: `hsl(${hue} 55% 45%)`,
            }}
            className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-extrabold"
          >
            {initial}
          </span>
        )}
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
            label="Foto de perfil (opcional)"
            hint={
              p.avatar_url
                ? "Sube otra para reemplazarla."
                : "Se ve en tu perfil, en vez de la inicial."
            }
          >
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
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

      {/* Ayuda y contacto */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <HelpCircle className="h-4 w-4" /> Ayuda
        </h2>

        {bizWa && (
          <a
            href={bizWa}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 flex items-center gap-3 rounded-2xl border border-income/25 bg-income/5 p-4 transition active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-income/10 text-income">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                Escribir al negocio
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {contact.businessName
                  ? `Dudas o ayuda con ${contact.businessName}`
                  : "Dudas o ayuda con tu envío"}{" "}
                · WhatsApp
              </p>
            </div>
          </a>
        )}

        <Link
          href="/c/opiniones"
          className="mb-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquareQuote className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Opiniones</p>
            <p className="truncate text-xs text-muted-foreground">
              Lo que dicen otros clientes del negocio
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>

        <Card className="p-4">
          <p className="mb-3 text-sm font-bold text-foreground">Cómo funciona</p>
          <div className="space-y-3">
            <HowStep
              n={1}
              icon={Send}
              title="Pides tu remesa"
              desc="Eliges el monto y quién recibe en Cuba."
            />
            <HowStep
              n={2}
              icon={Check}
              title="El negocio la acepta"
              desc="Confirma el envío y empieza el reparto."
            />
            <HowStep
              n={3}
              icon={PartyPopper}
              title="Llega a tu familia"
              desc="Sigues cada paso y ganas puntos con cada envío."
            />
          </div>
        </Card>
      </section>

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

function HowStep({
  n,
  icon: Icon,
  title,
  desc,
}: {
  n: number;
  icon: typeof Send;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {n}
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
