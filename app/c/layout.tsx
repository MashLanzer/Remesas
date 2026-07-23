import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, getExchangeRates, getMyPoints } from "@/lib/data";
import { PaperPlane } from "@/components/paper-plane";
import { ClienteNav } from "@/components/cliente-nav";

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

  // Datos para el FAB "Enviar" (formulario de remesa en un sheet global).
  const [rates, points, cfgRes] = await Promise.all([
    getExchangeRates(),
    getMyPoints(),
    supabase.rpc("my_client_config"),
  ]);
  const cfg = (Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data) as
    | { point_value_usd?: number | null; redeem_min_points?: number | null }
    | null;
  const pointValue = Number(cfg?.point_value_usd ?? 0.05) || 0.05;
  const redeemMin = Number(cfg?.redeem_min_points ?? 100) || 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <PaperPlane className="h-4 w-4 -translate-x-px" />
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Giro
            </span>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-md animate-fade-up px-4 pb-28 pt-4">
        {children}
      </main>
      <ClienteNav
        rates={rates}
        pointsBalance={points.balance}
        redeemMin={redeemMin}
        pointValue={pointValue}
      />
    </div>
  );
}
