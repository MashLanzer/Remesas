import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAlertCount,
  getBusinessSettings,
  getSessionContext,
  getExchangeRates,
  getRateHistory,
  getOrders,
} from "@/lib/data";
import { BottomNav } from "@/components/nav";
import { TopBar } from "@/components/top-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Onboarding / equipo: elegir rol y aprobación de repartidores.
  const ctx = await getSessionContext();
  if (ctx.needsOnboarding) redirect("/onboarding");
  // El cliente tiene su propia app (lado público).
  if (ctx.isCliente) redirect("/c");
  // Solo el repartidor ya aprobado ('active') entra; cualquier otro estado
  // (pendiente, u otro) espera en /pendiente.
  if (ctx.role === "repartidor" && ctx.memberStatus !== "active") {
    redirect("/pendiente");
  }

  const [alertCount, settings, rates, rateHistory, pendingOrders, profileRes] =
    await Promise.all([
      getAlertCount(),
      getBusinessSettings(),
      getExchangeRates(),
      getRateHistory(),
      getOrders({ pendingOnly: true }),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);
  const p = (profileRes.data ?? {}) as Record<string, string | null>;

  const card = {
    name: p.full_name ?? null,
    businessName: settings.business_name ?? null,
    phone: p.phone ?? null,
    zelle: p.zelle ?? null,
    cashapp: p.cashapp ?? null,
    paypal: p.paypal ?? null,
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        email={user.email}
        alertCount={alertCount}
        pendingOrders={pendingOrders.length}
        card={card}
        rates={rates}
        rateHistory={rateHistory}
      />
      <main className="mx-auto max-w-md animate-fade-up px-4 pb-24 pt-4">
        {children}
      </main>
      <BottomNav isOperador={ctx.isOperador} />
    </div>
  );
}
