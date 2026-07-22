import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getActiveProducts } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { StoreView } from "@/components/store-view";

export const dynamic = "force-dynamic";

export default async function TiendaPage() {
  const products = await getActiveProducts();
  return (
    <div>
      <Link
        href="/c"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>
      <PageHeader title="Tienda" subtitle="Combos, recargas y más para Cuba" />
      <StoreView products={products} />
    </div>
  );
}
