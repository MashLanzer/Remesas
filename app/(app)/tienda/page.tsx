import { redirect } from "next/navigation";
import { getStoreOrders, getSessionContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { StoreOrdersManager } from "@/components/store-orders-manager";

export const dynamic = "force-dynamic";

export default async function TiendaPedidosPage() {
  const ctx = await getSessionContext();
  if (ctx.isCliente || (!ctx.isOperador && ctx.role !== "repartidor")) {
    redirect("/");
  }
  const orders = await getStoreOrders();

  return (
    <div>
      <PageHeader title="Pedidos de tienda" subtitle="Combos y recargas de tus clientes" />
      <StoreOrdersManager orders={orders} />
    </div>
  );
}
