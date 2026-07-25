import Link from "next/link";
import { ArrowLeft, MessageSquareQuote } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { getBusinessReviews } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ClienteOpinionesPage() {
  const data = await getBusinessReviews();

  return (
    <div className="space-y-5">
      <Link
        href="/c"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>

      <div className="mb-1 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquareQuote className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Opiniones
          </h1>
          <p className="text-sm text-muted-foreground">
            Lo que dicen otros clientes
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="hero-gradient rounded-3xl p-5 text-white shadow-xl">
        <div className="flex items-end gap-3">
          <p className="tabular text-5xl font-extrabold">
            {data && data.total > 0 ? data.avg.toFixed(1) : "—"}
          </p>
          <div className="mb-1.5">
            <StarRating value={data?.avg ?? 0} size="md" />
            <p className="mt-0.5 text-xs text-white/80">
              {data?.total ?? 0} reseña{(data?.total ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      {/* Lista */}
      {!data || data.list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aún no hay reseñas. Cuando recibas un envío podrás calificar y ayudar a
          otros clientes.
        </p>
      ) : (
        <div className="space-y-3">
          {data.list.map((r, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {r.name || "Cliente"}
                </span>
                <StarRating value={r.rating} />
              </div>
              {r.comment && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  “{r.comment}”
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
