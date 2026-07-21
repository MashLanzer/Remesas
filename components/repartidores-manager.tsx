"use client";

import { useTransition } from "react";
import { UserCog, Truck, Check } from "lucide-react";
import { Card } from "@/components/ui";
import { setUserRole } from "@/app/actions";
import type { Profile } from "@/lib/types";

export function RepartidoresManager({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string | null;
}) {
  return (
    <div className="space-y-2">
      {profiles.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Aún no hay otras cuentas. Cuando tu repartidor en Cuba entre con su
            Google por primera vez, aparecerá aquí para que lo marques como
            repartidor.
          </p>
        </Card>
      )}
      {profiles.map((p) => (
        <Row key={p.id} profile={p} isSelf={p.id === currentUserId} />
      ))}
    </div>
  );
}

function Row({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const isOperador = profile.role === "operador";

  return (
    <Card className="flex items-center justify-between gap-3 p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
            (isOperador ? "bg-primary/10 text-primary" : "bg-info/10 text-info")
          }
        >
          {isOperador ? <UserCog className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {profile.full_name || "Sin nombre"}
            {isSelf && <span className="text-muted-foreground"> · tú</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {isOperador ? "Operador (ve todo)" : "Repartidor (solo lo suyo)"}
          </p>
        </div>
      </div>

      {!isSelf && (
        <button
          onClick={() =>
            start(() =>
              setUserRole(profile.id, isOperador ? "repartidor" : "operador")
            )
          }
          disabled={pending}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition active:scale-95 disabled:opacity-50"
        >
          {isOperador ? "Hacer repartidor" : "Hacer operador"}
        </button>
      )}
      {isSelf && <Check className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </Card>
  );
}
