import { getActivePackages, getActiveProducts } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { PackagesView } from "@/components/packages-view";
import { StoreView } from "@/components/store-view";

export const dynamic = "force-dynamic";

export default async function TiendaPage() {
  const [packages, products] = await Promise.all([
    getActivePackages(),
    getActiveProducts(),
  ]);

  const hasProducts = products.length > 0;

  return (
    <div>
      <PageHeader
        title="Tienda"
        subtitle="Paquetes de remesa listos para enviar a tu familia"
      />

      <PackagesView packages={packages} />

      {hasProducts && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-foreground">
            Otros productos
          </h2>
          <StoreView products={products} />
        </div>
      )}
    </div>
  );
}
