import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import {
  getOrders,
  getRepartidores,
  getExchangeRates,
  getBusinessSettings,
  getSessionContext,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { OrdersManager } from "@/components/orders-manager";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const ctx = await getSessionContext();
  // Solo personal (operador o repartidor). El cliente no entra aquí.
  if (ctx.isCliente || (!ctx.isOperador && ctx.role !== "repartidor")) {
    redirect("/");
  }
  const supabase = await createClient();
  const [orders, repartidores, rates, settings, profRes] = await Promise.all([
    getOrders(),
    ctx.isOperador ? getRepartidores() : Promise.resolve([]),
    getExchangeRates(),
    getBusinessSettings(),
    ctx.userId
      ? supabase
          .from("profiles")
          .select("default_split_percent")
          .eq("id", ctx.userId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  // Estimación de ganancia del repartidor antes de aceptar (misma fórmula que
  // al aceptar: comisión según reglas del negocio + su % de reparto).
  const earn = ctx.isOperador
    ? undefined
    : {
        threshold: Number(settings.commission_threshold ?? 100) || 100,
        percent: Number(settings.commission_percent ?? 10) || 10,
        flat: Number(settings.commission_flat ?? 5) || 5,
        split:
          Number(
            (profRes.data as { default_split_percent?: number } | null)
              ?.default_split_percent
          ) || 50,
      };

  return (
    <div>
      <PageHeader
        title="Pedidos"
        subtitle="Solicitudes de remesa de tus clientes"
        icon={ctx.isOperador ? undefined : Inbox}
      />
      <OrdersManager
        orders={orders}
        rates={rates}
        earn={earn}
        repartidores={repartidores.map((r) => ({
          id: r.id,
          name: r.full_name || "Repartidor",
          coverage: ((r as { coverage_provinces?: string | null })
            .coverage_provinces || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }))}
      />
    </div>
  );
}
