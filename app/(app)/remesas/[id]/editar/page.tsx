import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getBeneficiaries,
  getBusinessSettings,
  getClients,
  getExchangeRates,
  getRemittance,
  getRepartidores,
  getSessionContext,
} from "@/lib/data";
import { RemittanceForm } from "@/components/remittance-form";

export const dynamic = "force-dynamic";

export default async function EditarRemesaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [remittance, clients, beneficiaries, rates, settings, repartidores, ctx] =
    await Promise.all([
      getRemittance(id),
      getClients(),
      getBeneficiaries(),
      getExchangeRates(),
      getBusinessSettings(),
      getRepartidores(),
      getSessionContext(),
    ]);

  if (!remittance) notFound();

  return (
    <div>
      <Link
        href={`/remesas/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
        Editar remesa
      </h1>
      <RemittanceForm
        clients={clients}
        beneficiaries={beneficiaries}
        rates={rates}
        defaultSplit={Number(remittance.my_split_percent)}
        initial={remittance}
        rules={settings}
        repartidores={repartidores}
        isOperador={ctx.isOperador}
      />
    </div>
  );
}
