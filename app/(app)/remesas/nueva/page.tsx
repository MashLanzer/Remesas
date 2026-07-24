import {
  getBeneficiaries,
  getBusinessSettings,
  getClients,
  getExchangeRates,
  getRemittance,
  getRemittances,
  getRepartidores,
  getSessionContext,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { RemittanceForm } from "@/components/remittance-form";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NuevaRemesaPage({
  searchParams,
}: {
  searchParams: Promise<{ dup?: string; cliente?: string; beneficiario?: string }>;
}) {
  const { dup, cliente, beneficiario } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    clients,
    beneficiaries,
    rates,
    settings,
    profileRes,
    prefill,
    repartidores,
    ctx,
  ] = await Promise.all([
    getClients(),
    getBeneficiaries(),
    getExchangeRates(),
    getBusinessSettings(),
    user
      ? supabase
          .from("profiles")
          .select("default_split_percent")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    dup ? getRemittance(dup) : Promise.resolve(null),
    getRepartidores(),
    getSessionContext(),
  ]);

  const defaultSplit = Number(profileRes.data?.default_split_percent ?? 50);

  // Últimas remesas (para avisar de posibles duplicados).
  const allRemesas = await getRemittances();
  const recentRemesas = allRemesas.slice(0, 40).map((r) => ({
    client_id: r.client_id,
    amount_usd: Number(r.amount_usd),
    created_at: r.created_at,
  }));

  return (
    <div>
      <PageHeader
        title={prefill ? "Duplicar remesa" : "Nueva remesa"}
        subtitle={prefill ? "Revisa los datos copiados" : "Registra un envío"}
      />
      <RemittanceForm
        clients={clients}
        beneficiaries={beneficiaries}
        rates={rates}
        defaultSplit={defaultSplit}
        rules={settings}
        defaultCurrency={settings.default_currency}
        defaultPayment={settings.default_payment_method}
        prefill={prefill ?? undefined}
        defaultClientId={cliente}
        defaultBeneficiaryId={beneficiario}
        repartidores={repartidores}
        isOperador={ctx.isOperador}
        recentRemesas={recentRemesas}
      />
    </div>
  );
}
