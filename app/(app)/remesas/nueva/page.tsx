import { getBeneficiaries, getClients, getExchangeRates } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { RemittanceForm } from "@/components/remittance-form";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NuevaRemesaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [clients, beneficiaries, rates, profileRes] = await Promise.all([
    getClients(),
    getBeneficiaries(),
    getExchangeRates(),
    user
      ? supabase.from("profiles").select("default_split_percent").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const defaultSplit = Number(profileRes.data?.default_split_percent ?? 50);

  return (
    <div>
      <PageHeader title="Nueva remesa" subtitle="Registra un envío" />
      <RemittanceForm
        clients={clients}
        beneficiaries={beneficiaries}
        rates={rates}
        defaultSplit={defaultSplit}
      />
    </div>
  );
}
