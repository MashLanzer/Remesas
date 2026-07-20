import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAlertCount } from "@/lib/data";
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

  const alertCount = await getAlertCount();

  return (
    <div className="min-h-screen bg-background">
      <TopBar email={user.email} alertCount={alertCount} />
      <main className="mx-auto max-w-md animate-fade-up px-4 pb-24 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
