"use client";

import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

export function RepartidorFilter({
  repartidores,
  value,
}: {
  repartidores: Profile[];
  value: string;
}) {
  const router = useRouter();
  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        Repartidor
      </label>
      <select
        value={value}
        onChange={(e) => {
          const rep = e.target.value;
          router.push(
            `/finanzas?tab=cuentas${rep ? `&rep=${rep}` : ""}`
          );
        }}
        className="w-full rounded-xl border border-input bg-background py-2.5 pl-3 pr-9 text-sm text-foreground outline-none"
      >
        <option value="">Todos (combinado)</option>
        {repartidores.map((r) => (
          <option key={r.id} value={r.id}>
            {r.full_name || "Repartidor"}
          </option>
        ))}
      </select>
    </div>
  );
}
