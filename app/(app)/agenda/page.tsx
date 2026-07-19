import { getClients, getBeneficiaries } from "@/lib/data";
import { AgendaView } from "@/components/agenda-view";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const [clients, beneficiaries] = await Promise.all([
    getClients(),
    getBeneficiaries(),
  ]);

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Clientes y beneficiarios" />
      <AgendaView clients={clients} beneficiaries={beneficiaries} />
    </div>
  );
}
