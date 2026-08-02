import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Users, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PaperPlane } from "@/components/paper-plane";
import { VaquitaContribute } from "@/components/vaquita-contribute";
import { usd } from "@/lib/utils";

export const dynamic = "force-dynamic";

type VaquitaPublic = {
  id: string;
  title: string | null;
  beneficiary_name: string;
  province: string | null;
  delivery_currency: string;
  goal_usd: number;
  status: string;
  business_name: string | null;
  brand_hue: number | null;
  phone: string | null;
  zelle: string | null;
  cashapp: string | null;
  paypal: string | null;
  raised: number;
  contributions: {
    name: string;
    amount: number;
    status: string;
    created_at: string;
  }[];
};

async function fetchVaquita(token: string): Promise<VaquitaPublic | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("vaquita_by_token", { p_token: token });
  return (data as VaquitaPublic | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const v = await fetchVaquita(token);
  if (!v) return { title: "Vaquita familiar" };
  const brand = v.business_name || "Giro";
  const title = `Vaquita para ${v.beneficiary_name} · ${brand}`;
  const description = `Entre varios juntamos para un envío a ${v.beneficiary_name}. Aporta lo que puedas.`;
  return { title, description, openGraph: { title, description, type: "website" } };
}

export default async function VaquitaPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const v = await fetchVaquita(token);
  if (!v) notFound();

  const brand = v.business_name || "Giro";
  const goal = Number(v.goal_usd) || 0;
  const raised = Number(v.raised) || 0;
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const closed = v.status !== "abierta";

  const methods = [
    v.zelle ? { k: "Zelle", val: v.zelle } : null,
    v.cashapp ? { k: "CashApp", val: v.cashapp } : null,
    v.paypal ? { k: "PayPal", val: v.paypal } : null,
  ].filter(Boolean) as { k: string; val: string }[];

  return (
    <div
      className="min-h-screen bg-background"
      style={
        v.brand_hue != null
          ? ({ "--brand-hue": String(v.brand_hue) } as React.CSSProperties)
          : undefined
      }
    >
      <div className="brand-scope mx-auto max-w-md px-4 pb-16 pt-6">
        {/* Marca */}
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PaperPlane className="h-4 w-4 -translate-x-px" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {brand}
          </span>
        </div>

        {/* Hero de la vaquita */}
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Users className="h-3.5 w-3.5" /> Vaquita familiar
          </p>
          <h1 className="mt-1 text-xl font-extrabold text-foreground">
            {v.title || `Para ${v.beneficiary_name}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Entre varios juntamos para un envío a{" "}
            <span className="font-semibold text-foreground">
              {v.beneficiary_name}
            </span>
            {v.province ? ` (${v.province})` : ""}.
          </p>

          <div className="mt-4">
            <div className="flex items-end justify-between">
              <p className="text-2xl font-extrabold text-foreground">
                {usd(raised)}
              </p>
              {goal > 0 && (
                <p className="text-sm text-muted-foreground">meta {usd(goal)}</p>
              )}
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${goal > 0 ? pct : raised > 0 ? 100 : 0}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {v.contributions.length} aporte
              {v.contributions.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Cómo pagar + aportar */}
        {closed ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Esta vaquita ya está cerrada. ¡Gracias!
          </div>
        ) : (
          <>
            {methods.length > 0 && (
              <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-bold text-foreground">
                  1) Paga por cualquiera de estos medios de {brand}
                </p>
                <div className="mt-2 space-y-2">
                  {methods.map((m) => (
                    <div
                      key={m.k}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {m.k}
                        </p>
                        <p className="truncate text-sm font-semibold text-foreground">
                          {m.val}
                        </p>
                      </div>
                      <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-bold text-foreground">
                2) Registra tu aporte
              </p>
              <VaquitaContribute token={token} />
            </div>
          </>
        )}

        {/* Aportes */}
        {v.contributions.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ya aportaron
            </p>
            <div className="space-y-2">
              {v.contributions.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="truncate text-sm font-medium text-foreground">
                    {c.name}
                    {c.status === "confirmado" ? " ✅" : ""}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-foreground">
                    {usd(Number(c.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Enviado con {brand} ✈️
        </p>
      </div>
    </div>
  );
}
