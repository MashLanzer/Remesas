import Link from "next/link";
import { ArrowLeft, Users, ChevronRight } from "lucide-react";
import { getMyVaquitas } from "@/lib/data";
import { Card } from "@/components/ui";
import { VaquitaCreate } from "@/components/vaquita-create";
import { usd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VaquitasClientePage() {
  const vaquitas = await getMyVaquitas();

  return (
    <div className="space-y-5">
      <Link
        href="/c"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Users className="h-5 w-5 text-primary" /> Vaquita familiar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Junten entre varios para un mismo envío. Comparte el enlace y cada quien
          aporta lo que pueda.
        </p>
      </div>

      <VaquitaCreate />

      {vaquitas.length > 0 && (
        <div className="space-y-2">
          {vaquitas.map((v) => {
            const goal = Number(v.goal_usd) || 0;
            const pct = goal > 0 ? Math.min(100, (v.raised / goal) * 100) : 0;
            return (
              <Link key={v.id} href={`/c/vaquita/${v.id}`} className="block">
                <Card className="space-y-2 p-3.5 transition active:scale-[0.99]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {v.title || v.beneficiary_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Para {v.beneficiary_name}
                        {v.status === "enviada" ? " · enviada ✅" : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${goal > 0 ? pct : v.raised > 0 ? 100 : 0}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-foreground">
                      {usd(v.raised)}
                      {goal > 0 ? ` / ${usd(goal)}` : ""}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
