import { Users } from "lucide-react";
import {
  getClients,
  getBeneficiaries,
  getRemittances,
  getSessionContext,
} from "@/lib/data";
import { AgendaView, type ContactStat } from "@/components/agenda-view";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const [clients, beneficiaries, remittances, ctx] = await Promise.all([
    getClients(),
    getBeneficiaries(),
    getRemittances(),
    getSessionContext(),
  ]);

  const clientStats: Record<string, ContactStat> = {};
  const benefStats: Record<string, ContactStat> = {};
  for (const r of remittances) {
    if (r.client_id) {
      const s = (clientStats[r.client_id] ??= { count: 0, total: 0, owed: 0 });
      s.count += 1;
      s.total += Number(r.amount_usd);
      if (!s.last || r.date > s.last) {
        s.last = r.date;
        s.lastId = r.id;
      }
      if (r.client_paid === false)
        s.owed = (s.owed ?? 0) + Number(r.total_received);
    }
    if (r.beneficiary_id) {
      const s = (benefStats[r.beneficiary_id] ??= { count: 0, total: 0 });
      s.count += 1;
      s.total += Number(r.amount_usd);
      if (!s.last || r.date > s.last) {
        s.last = r.date;
        s.lastId = r.id;
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={
          ctx.isOperador
            ? "Clientes y beneficiarios"
            : "Tus clientes y beneficiarios"
        }
        icon={ctx.isOperador ? undefined : Users}
      />
      <AgendaView
        clients={clients}
        beneficiaries={beneficiaries}
        clientStats={clientStats}
        benefStats={benefStats}
      />
    </div>
  );
}
