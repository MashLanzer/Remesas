import { getActiveProducts } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { StoreView } from "@/components/store-view";

export const dynamic = "force-dynamic";

export default async function TiendaPage() {
  const products = await getActiveProducts();
  return (
    <div>
      <PageHeader title="Tienda" subtitle="Combos, recargas y más para Cuba" />
      <StoreView products={products} />
    </div>
  );
}
