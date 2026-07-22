import { redirect } from "next/navigation";
import { getOrders, getSessionContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { OrdersManager } from "@/components/orders-manager";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const ctx = await getSessionContext();
  // Solo personal (operador o repartidor). El cliente no entra aquí.
  if (ctx.isCliente || (!ctx.isOperador && ctx.role !== "repartidor")) {
    redirect("/");
  }
  const orders = await getOrders();

  return (
    <div>
      <PageHeader
        title="Pedidos"
        subtitle="Solicitudes de remesa de tus clientes"
      />
      <OrdersManager orders={orders} />
    </div>
  );
}
