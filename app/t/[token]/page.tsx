import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaperPlane } from "@/components/paper-plane";
import { OrderTimeline } from "@/components/order-timeline";
import { ConfirmReceivedButton } from "@/components/confirm-received-button";
import { usd, localAmount } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Track = {
  beneficiary_name: string | null;
  amount_usd: number;
  local_amount: number | null;
  delivery_currency: string | null;
  status: string;
  created_at: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  received_at: string | null;
  business_name: string | null;
};

export default async function TrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("track_get", { p_token: token });
  const t = ((Array.isArray(data) ? data[0] : data) as Track | undefined) ?? null;
  if (!t) notFound();

  const brand = t.business_name || "Giro";
  const delivered = !!t.delivered_at;
  const received = !!t.received_at;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <PaperPlane className="h-4 w-4 -translate-x-px" />
        </span>
        <span className="text-lg font-bold tracking-tight text-foreground">
          {brand}
        </span>
      </div>

      <div className="mb-5 rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 p-5 text-white shadow-xl">
        <p className="text-xs font-medium text-white/70">
          Remesa para {t.beneficiary_name || "ti"}
        </p>
        <p className="tabular mt-1 text-3xl font-extrabold">
          {t.local_amount != null && t.delivery_currency
            ? `${localAmount(Number(t.local_amount))} ${t.delivery_currency}`
            : usd(Number(t.amount_usd))}
        </p>
        <p className="mt-0.5 text-xs text-white/70">
          {delivered ? "¡Entregada!" : "En proceso"}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <OrderTimeline
          status={t.status}
          created_at={t.created_at}
          accepted_at={t.accepted_at}
          delivered_at={t.delivered_at}
          received_at={t.received_at}
        />
      </div>

      {delivered && !received && (
        <div className="mt-4">
          <ConfirmReceivedButton token={token} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Confirma cuando tengas el dinero en la mano.
          </p>
        </div>
      )}
      {received && (
        <p className="mt-4 text-center text-sm font-semibold text-income">
          ¡Gracias! Recepción confirmada ✅
        </p>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Seguimiento de tu remesa · {brand}
      </p>
    </main>
  );
}
