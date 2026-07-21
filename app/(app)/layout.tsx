import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAlertCount, getBusinessSettings } from "@/lib/data";
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

  const [alertCount, settings, profileRes] = await Promise.all([
    getAlertCount(),
    getBusinessSettings(),
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
      <TopBar email={user.email} alertCount={alertCount} card={card} />
      <main className="mx-auto max-w-md animate-fade-up px-4 pb-24 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
