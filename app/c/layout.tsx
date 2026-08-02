import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getSessionContext,
  getExchangeRates,
  getMyPoints,
  getMyBeneficiaries,
  getMyOperatorContact,
  getMyNotifications,
  getBusinessSettings,
} from "@/lib/data";
import { PaperPlane } from "@/components/paper-plane";
import { NotificationBell } from "@/components/notification-bell";
import { ClienteNav } from "@/components/cliente-nav";
import { ClienteProfileMenu } from "@/components/cliente-profile-menu";
import { ClienteOnboarding } from "@/components/cliente-onboarding";
import { PageTransition } from "@/components/page-transition";
import { PinLock } from "@/components/pin-lock";
import { LangProvider } from "@/components/lang-provider";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getSessionContext();
  if (ctx.needsOnboarding) redirect("/onboarding");
  // Esta área es solo para clientes; el resto va a la app de negocio.
  if (!ctx.isCliente) redirect("/");

  const lang = await getLang();

  // Datos para el FAB "Enviar" (formulario de remesa en un sheet global).
  const [rates, points, cfgRes, beneficiaries, profileRes, contact, notifs, settings] =
    await Promise.all([
      getExchangeRates(),
      getMyPoints(),
      supabase.rpc("my_client_config"),
      getMyBeneficiaries(),
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single(),
      getMyOperatorContact(),
      getMyNotifications(),
      getBusinessSettings(),
    ]);
  const fullName = (profileRes.data?.full_name as string | null) ?? null;
  const avatarUrl = (profileRes.data?.avatar_url as string | null) ?? null;
  const firstName = fullName?.trim().split(" ")[0] ?? null;
  const initial = (firstName || user.email || "?").charAt(0).toUpperCase();
  const bizDigits = contact.phone?.replace(/\D/g, "") || "";
  const bizWa = bizDigits
    ? `https://wa.me/${bizDigits}?text=${encodeURIComponent(
        `Hola${
          contact.businessName ? ` ${contact.businessName}` : ""
        }, tengo una consulta.`
      )}`
    : null;
  const cfg = (Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data) as
    | { point_value_usd?: number | null; redeem_min_points?: number | null }
    | null;
  const pointValue = Number(cfg?.point_value_usd ?? 0.05) || 0.05;
  const redeemMin = Number(cfg?.redeem_min_points ?? 100) || 100;

  return (
    <LangProvider lang={lang}>
    <div
      className="flex h-screen flex-col overflow-hidden bg-background supports-[height:100dvh]:h-[100dvh]"
      style={
        contact.brandHue != null
          ? ({ "--brand-hue": String(contact.brandHue) } as React.CSSProperties)
          : undefined
      }
    >
      <PinLock />
      <ClienteOnboarding />
      <header className="safe-top z-30 shrink-0 border-b border-border bg-background">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <PaperPlane className="h-4 w-4 -translate-x-px" />
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Giro
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell items={notifs.items} unread={notifs.unread} />
            <Link
              href="/c/opiniones"
              className="flex h-9 w-9 items-center justify-center rounded-full text-amber-400 transition hover:bg-amber-400/10"
              aria-label="Opiniones"
              title="Opiniones"
            >
              <Star className="h-5 w-5" />
            </Link>
            {bizWa && (
              <a
                href={bizWa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full text-income transition hover:bg-income/10"
                aria-label="Dudas por WhatsApp"
                title="Escribir al negocio"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
            <ClienteProfileMenu
              firstName={firstName}
              initial={initial}
              email={user.email}
              avatarUrl={avatarUrl}
            />
          </div>
        </div>
      </header>
      {/* El scroll lo hace ESTE contenedor acotado (no el documento). Así el
          WebView de Android compone solo el alto de la pantalla y nunca una
          capa gigante que duplique contenido en páginas largas. */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md px-4 pb-28 pt-4">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <ClienteNav
        rates={rates}
        pointsBalance={points.balance}
        redeemMin={redeemMin}
        pointValue={pointValue}
        beneficiaries={beneficiaries}
        transferBonusPct={settings.transfer_bonus_pct}
      />
    </div>
    </LangProvider>
  );
}
