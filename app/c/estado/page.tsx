import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyOrders, getMyOperatorContact } from "@/lib/data";
import { orderDisplay } from "@/components/order-status-badge";
import { PageHeader } from "@/components/ui";
import { AccountSummary } from "@/components/account-summary";
import { getLang } from "@/lib/lang";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EstadoCuentaPage() {
  const lang = await getLang();
  const tr = (s: string) => translate(lang, s);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [orders, contact, profRes] = await Promise.all([
    getMyOrders(),
    getMyOperatorContact(),
    user
      ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Solo lo entregado cuenta como "enviado a la familia".
  const sent = orders
    .filter((o) => {
      const d = orderDisplay(o);
      return d === "entregado" || d === "recibido";
    })
    .map((o) => ({
      amount_usd: Number(o.amount_usd) || 0,
      at: o.delivered_at || o.created_at,
      beneficiary_name: o.beneficiary_name ?? null,
    }));

  const clientName =
    (profRes.data as { full_name?: string | null } | null)?.full_name ?? null;

  return (
    <div className="space-y-5">
      <Link
        href="/c/perfil"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {tr("Perfil")}
      </Link>

      <PageHeader
        title={tr("Mi resumen")}
        subtitle={tr("Lo que has enviado a tu familia")}
        icon={Wallet}
      />

      <AccountSummary
        orders={sent}
        brand={contact.businessName || "Giro"}
        clientName={clientName}
      />
    </div>
  );
}
