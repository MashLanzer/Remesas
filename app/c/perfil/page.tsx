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
import { ThemeSwitch } from "@/components/theme-switch";
import { LangSwitch } from "@/components/lang-switch";
import { DataModeSwitch } from "@/components/data-mode-switch";
import { ClearLocalData } from "@/components/clear-local-data";
import { PinSetup } from "@/components/pin-setup";
import { usd } from "@/lib/utils";
import { Card, Field, Input, Button } from "@/components/ui";
import { Settings } from "lucide-react";
import { getLang } from "@/lib/lang";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ClientePerfilPage() {
  const lang = await getLang();
  const tr = (s: string) => translate(lang, s);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se piden también phone2/address; si la migración 0062 aún no se aplicó, el
  // select falla, así que se reintenta con las columnas de siempre.
  let profile: Record<string, unknown> | null = null;
  if (user) {
    const full = await supabase
      .from("profiles")
      .select("full_name, phone, phone2, address, avatar_url")
      .eq("id", user.id)
      .single();
    if (full.error) {
      const basic = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", user.id)
        .single();
      profile = basic.data;
    } else {
      profile = full.data;
    }
  }

  const p = (profile ?? {}) as {
    full_name?: string | null;
    phone?: string | null;
    phone2?: string | null;
    address?: string | null;
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
        <ArrowLeft className="h-4 w-4" /> {tr("Inicio")}
      </Link>

      {/* Cabecera con foto o avatar de color propio + mini-stats */}
      <div className="flex flex-col items-center pt-1 text-center">
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.avatar_url}
            alt={tr("Foto de perfil")}
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
          {p.full_name || tr("Tu perfil")}
        </h1>
        {user?.email && (
          <p className="text-sm text-muted-foreground">{user.email}</p>
        )}
      </div>

      <Link href="/c/estado" className="grid grid-cols-3 gap-2">
        <MiniStat icon={Send} value={String(delivered.length)} label={tr("Envíos")} />
        <MiniStat icon={Wallet} value={usd(totalEnviado)} label={tr("Enviado")} />
        <MiniStat icon={Star} value={String(points.balance)} label={tr("Puntos")} />
      </Link>
      <p className="-mt-3 text-center text-[11px] text-muted-foreground">
        {tr("Toca para ver tu resumen y descargarlo")}
      </p>

      <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {tr("Tus datos para los envíos")}
      </h2>

      <Card>
        <form action={updateClientProfile} className="space-y-3">
          <Field label={tr("Nombre")}>
            <Input
              name="full_name"
              defaultValue={p.full_name ?? ""}
              placeholder={tr("Tu nombre")}
            />
          </Field>
          <Field
            label={tr("Foto de perfil (opcional)")}
            hint={
              p.avatar_url
                ? tr("Sube otra para reemplazarla.")
                : tr("Se ve en tu perfil, en vez de la inicial.")
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
            label={tr("Teléfono / WhatsApp")}
            hint={tr("El negocio te contactará por aquí.")}
          >
            <Input
              name="phone"
              inputMode="tel"
              defaultValue={p.phone ?? ""}
              placeholder="+1 305 000 0000"
            />
          </Field>
          <Field
            label={tr("Segundo teléfono (opcional)")}
            hint={tr("Por si no contestan el principal.")}
          >
            <Input
              name="phone2"
              inputMode="tel"
              defaultValue={p.phone2 ?? ""}
              placeholder="+1 786 000 0000"
            />
          </Field>
          <Field
            label={tr("Dirección o ciudad (opcional)")}
            hint={tr("Ayuda al negocio a ubicarte.")}
          >
            <Input
              name="address"
              defaultValue={p.address ?? ""}
              placeholder={tr("Ej: Miami, FL")}
            />
          </Field>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <Button type="submit" className="w-full">
            {tr("Guardar")}
          </Button>
        </form>
      </Card>

      <SavedBeneficiaries />

      {/* Ajustes de la app */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Settings className="h-4 w-4" /> {tr("Ajustes")}
        </h2>
        <Card className="space-y-4">
          <LangSwitch />
          <div className="border-t border-border" />
          <ThemeSwitch />
          <div className="border-t border-border" />
          <DataModeSwitch />
          <div className="border-t border-border" />
          <PinSetup />
          <div className="border-t border-border" />
          <ClearLocalData />
        </Card>
      </section>

      {/* Ayuda y contacto */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <HelpCircle className="h-4 w-4" /> {tr("Ayuda")}
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
                {tr("Escribir al negocio")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {contact.businessName
                  ? `${tr("Dudas o ayuda con")} ${contact.businessName}`
                  : tr("Dudas o ayuda con tu envío")}{" "}
                · WhatsApp
              </p>
            </div>
          </a>
        )}

        <Link
          href="/c/ayuda"
          className="mb-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HelpCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">{tr("Centro de ayuda")}</p>
            <p className="truncate text-xs text-muted-foreground">
              {tr("Tarifas, tiempos y preguntas frecuentes")}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>

        <Link
          href="/c/opiniones"
          className="mb-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquareQuote className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">{tr("Opiniones")}</p>
            <p className="truncate text-xs text-muted-foreground">
              {tr("Lo que dicen otros clientes del negocio")}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>

        <Card className="p-4">
          <p className="mb-3 text-sm font-bold text-foreground">{tr("Cómo funciona")}</p>
          <div className="space-y-3">
            <HowStep
              n={1}
              icon={Send}
              title={tr("Pides tu remesa")}
              desc={tr("Eliges el monto y quién recibe en Cuba.")}
            />
            <HowStep
              n={2}
              icon={Check}
              title={tr("El negocio la acepta")}
              desc={tr("Confirma el envío y empieza el reparto.")}
            />
            <HowStep
              n={3}
              icon={PartyPopper}
              title={tr("Llega a tu familia")}
              desc={tr("Sigues cada paso y ganas puntos con cada envío.")}
            />
          </div>
        </Card>
      </section>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive transition active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" /> {tr("Cerrar sesión")}
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
