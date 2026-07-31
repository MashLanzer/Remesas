import {
  getRemittances,
  getSettlements,
  getSessionContext,
  getOrders,
  getBusinessSettings,
  getExchangeRates,
} from "@/lib/data";
import Link from "next/link";
import { Route, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calcPartnerBalance } from "@/lib/calc";
import { DashboardView } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctx = await getSessionContext();

  const [remittances, settlements, pendingOrders, settings, rates, profileRes] =
    await Promise.all([
      getRemittances(),
      getSettlements(),
      getOrders({ pendingOnly: true }),
      getBusinessSettings(),
      getExchangeRates(),
      user
        ? supabase
            .from("profiles")
            .select("full_name, monthly_goal, monthly_goal_count")
            .eq("id", user.id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

  const partnerBalance = calcPartnerBalance(remittances, settlements);
  const name = profileRes.data?.full_name ?? null;
  const monthlyGoal = settings.monthly_goal ? Number(settings.monthly_goal) : 0;
  const personalGoal = Number(
    (profileRes.data as { monthly_goal?: number | null } | null)?.monthly_goal ?? 0
  );
  const personalGoalCount = Number(
    (profileRes.data as { monthly_goal_count?: number | null } | null)
      ?.monthly_goal_count ?? 0
  );

  // Ruta de hoy: solo repartidor con entregas pendientes.
  const pendientes = remittances.filter((r) => r.status === "pendiente");
  const provincias = new Set(
    pendientes
      .map((r) => r.beneficiary?.province?.trim())
      .filter(Boolean) as string[]
  );

  return (
    <>
      {!ctx.isOperador && pendientes.length > 0 && (
        <Link href="/ruta" className="mb-4 block">
          <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3.5 transition active:scale-[0.99]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Route className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Ruta de hoy
              </p>
              <p className="text-xs text-muted-foreground">
                {pendientes.length} entrega{pendientes.length === 1 ? "" : "s"}
                {provincias.size > 0 &&
                  ` · ${provincias.size} provincia${
                    provincias.size === 1 ? "" : "s"
                  }`}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      )}
      <DashboardView
        remittances={remittances}
        partnerBalance={partnerBalance}
        name={name}
        isOperador={ctx.isOperador}
        pendingOrders={pendingOrders.length}
        monthlyGoal={monthlyGoal}
        personalGoal={personalGoal}
        personalGoalCount={personalGoalCount}
        brand={settings.business_name || "Giro"}
        rates={rates}
      />
    </>
  );
}
