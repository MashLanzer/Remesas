import Link from "next/link";
import { ArrowLeft, LogOut, Send, Wallet, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyOrders, getMyPoints, getMyOperatorContact } from "@/lib/data";
import { orderDisplay } from "@/components/order-status-badge";
import { PerfilMenu } from "@/components/perfil-menu";
import { usd } from "@/lib/utils";
import { Card } from "@/components/ui";
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

      {/* Menú del perfil: cada cosa abre en una hoja o navega */}
      <PerfilMenu
        profile={{
          full_name: p.full_name,
          phone: p.phone,
          phone2: p.phone2,
          address: p.address,
        }}
        email={user?.email ?? null}
        hasAvatar={!!p.avatar_url}
        bizWa={bizWa}
        businessName={contact.businessName ?? null}
      />

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

