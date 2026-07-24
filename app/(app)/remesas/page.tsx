import { Plus } from "lucide-react";
import { getRemittances, getSessionContext } from "@/lib/data";
import { LinkButton, PageHeader } from "@/components/ui";
import { RemesasList } from "@/components/remesas-list";

export const dynamic = "force-dynamic";

export default async function RemesasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q, estado } = await searchParams;
  const [all, ctx] = await Promise.all([
    getRemittances(),
    getSessionContext(),
  ]);

  return (
    <div>
      <PageHeader
        title="Remesas"
        subtitle={`${all.length} en total`}
        action={
          <LinkButton href="/remesas/nueva">
            <Plus className="h-4 w-4" /> Nueva
          </LinkButton>
        }
      />
      <RemesasList
        remittances={all}
        initialQuery={q ?? ""}
        initialEstado={estado ?? "todas"}
        isOperador={ctx.isOperador}
      />
    </div>
  );
}
