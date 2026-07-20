import { getClients, getBeneficiaries, getRemittances } from "@/lib/data";
import { AgendaView, type ContactStat } from "@/components/agenda-view";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const [clients, beneficiaries, remittances] = await Promise.all([
    getClients(),
    getBeneficiaries(),
    getRemittances(),
  ]);

  const clientStats: Record<string, ContactStat> = {};
  const benefStats: Record<string, ContactStat> = {};
  for (const r of remittances) {
    if (r.client_id) {
      const s = (clientStats[r.client_id] ??= { count: 0, total: 0 });
      s.count += 1;
      s.total += Number(r.amount_usd);
    }
    if (r.beneficiary_id) {
      const s = (benefStats[r.beneficiary_id] ??= { count: 0, total: 0 });
      s.count += 1;
      s.total += Number(r.amount_usd);
    }
  }

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Clientes y beneficiarios" />
      <AgendaView
        clients={clients}
        beneficiaries={beneficiaries}
        clientStats={clientStats}
        benefStats={benefStats}
      />
    </div>
  );
}
