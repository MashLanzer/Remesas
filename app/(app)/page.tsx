import {
  getRemittances,
  getSettlements,
  getSessionContext,
  getOrders,
} from "@/lib/data";
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

  const [remittances, settlements, pendingOrders, profileRes] =
    await Promise.all([
      getRemittances(),
      getSettlements(),
      getOrders({ pendingOnly: true }),
      user
        ? supabase.from("profiles").select("full_name").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
    ]);

  const partnerBalance = calcPartnerBalance(remittances, settlements);
  const name = profileRes.data?.full_name ?? null;

  return (
    <DashboardView
      remittances={remittances}
      partnerBalance={partnerBalance}
      name={name}
      isOperador={ctx.isOperador}
      pendingOrders={pendingOrders.length}
    />
  );
}
