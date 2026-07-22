import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProducts, getSessionContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { ProductsManager } from "@/components/products-manager";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const ctx = await getSessionContext();
  if (!ctx.isOperador) redirect("/ajustes");
  const products = await getProducts();

  return (
    <div>
      <Link
        href="/ajustes"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Ajustes
      </Link>
      <PageHeader title="Productos" subtitle="Tu catálogo: combos, recargas y más" />
      <ProductsManager products={products} />
    </div>
  );
}
