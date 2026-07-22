"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";
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
      <Select
        title="Repartidor"
        value={value}
        onChange={(e) => {
          const rep = e.target.value;
          router.push(`/finanzas?tab=cuentas${rep ? `&rep=${rep}` : ""}`);
        }}
      >
        <option value="">Todos (combinado)</option>
        {repartidores.map((r) => (
          <option key={r.id} value={r.id}>
            {r.full_name || "Repartidor"}
          </option>
        ))}
      </Select>
    </div>
  );
}
