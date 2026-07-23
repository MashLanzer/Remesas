import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPackages, getSessionContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { PackagesManager } from "@/components/packages-manager";

export const dynamic = "force-dynamic";

export default async function PaquetesPage() {
  const ctx = await getSessionContext();
  if (!ctx.isOperador) redirect("/ajustes");
  const packages = await getPackages();

  return (
    <div>
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>
      <PageHeader
        title="Paquetes de remesa"
        subtitle="Ofertas de envío listas para que el cliente pida con un toque"
      />
      <PackagesManager packages={packages} />
    </div>
  );
}
