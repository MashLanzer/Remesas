import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PendientePage() {
  const ctx = await getSessionContext();
  if (!ctx.userId) redirect("/login");
  // Si ya no está pendiente (aprobado o cambió), a la app.
  if (!(ctx.role === "repartidor" && ctx.memberStatus === "pending")) {
    redirect("/");
  }

  // Nombre del operador al que se unió.
  const supabase = await createClient();
  let operadorName: string | null = null;
  if (ctx.tenantId) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", ctx.tenantId)
      .maybeSingle();
    operadorName = (data as { full_name?: string } | null)?.full_name ?? null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-full max-w-sm animate-fade-up">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 text-warning">
          <Clock className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Esperando aprobación
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu solicitud fue enviada{operadorName ? ` a ${operadorName}` : ""}. En
          cuanto te acepte, entrarás a la app y verás tus entregas.
        </p>

        <form action="/pendiente" className="mt-6">
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition active:scale-[0.98]"
          >
            Ya me aceptaron · Entrar
          </button>
        </form>
        <form action="/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="w-full text-center text-xs text-muted-foreground"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
