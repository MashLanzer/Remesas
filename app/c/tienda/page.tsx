import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getActivePackages,
  getBusinessSettings,
  getExchangeRates,
} from "@/lib/data";
import { PackagesView } from "@/components/packages-view";
import { getLang } from "@/lib/lang";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function TiendaPage() {
  const lang = await getLang();
  const tr = (s: string) => translate(lang, s);
  const supabase = await createClient();
  const [packages, rates, settings, popRes] = await Promise.all([
    getActivePackages(),
    getExchangeRates(),
    getBusinessSettings(),
    supabase.rpc("package_popularity"),
  ]);
  const rules = {
    commission_threshold: settings.commission_threshold,
    commission_percent: settings.commission_percent,
    commission_flat: settings.commission_flat,
  };

  // Ordenar por popularidad (los más pedidos primero). Si nadie ha pedido aún,
  // se conserva el orden que el negocio definió (getActivePackages ya viene
  // ordenado por 'sort'). El índice original rompe empates de forma estable.
  const popMap = new Map<string, number>();
  for (const row of (popRes.data as { package_id: string; order_count: number }[]) ?? []) {
    popMap.set(row.package_id, Number(row.order_count) || 0);
  }
  const sortedPackages = packages
    .map((p, i) => ({ p, i, pop: popMap.get(p.id) ?? 0 }))
    .sort((a, b) => b.pop - a.pop || a.i - b.i)
    .map((x) => x.p);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Gift className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {tr("Paquetes para tu familia")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Elige uno y llega a Cuba en un toque · a la tasa de hoy")}
          </p>
        </div>
      </div>
      <PackagesView
        packages={sortedPackages}
        rates={rates}
        rules={rules}
        transferBonusPct={settings.transfer_bonus_pct}
      />
    </div>
  );
}
