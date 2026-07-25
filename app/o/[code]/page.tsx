import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PaperPlane } from "@/components/paper-plane";
import { StarRating } from "@/components/star-rating";
import { getBusinessReviews } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const data = await getBusinessReviews(code);
  const name = data?.businessName || "Giro";
  const title = `Opiniones de ${name}`;
  const description = data
    ? `${data.avg.toFixed(1)} ★ · ${data.total} reseña${data.total === 1 ? "" : "s"} de clientes reales.`
    : "Reseñas verificadas de clientes.";
  return { title, description, openGraph: { title, description } };
}

export default async function PublicReviewsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getBusinessReviews(code);
  if (!data || !data.businessName) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <PaperPlane className="h-4 w-4 -translate-x-px" />
        </span>
        <span className="text-lg font-bold tracking-tight text-foreground">
          {data.businessName}
        </span>
      </div>

      {/* Resumen */}
      <div className="hero-gradient mb-5 rounded-3xl p-5 text-white shadow-xl">
        <p className="text-sm font-medium text-white/80">Opiniones de clientes</p>
        <div className="mt-1 flex items-end gap-3">
          <p className="tabular text-5xl font-extrabold">
            {data.total > 0 ? data.avg.toFixed(1) : "—"}
          </p>
          <div className="mb-1.5">
            <StarRating value={data.avg} size="md" />
            <p className="mt-0.5 text-xs text-white/80">
              {data.total} reseña{data.total === 1 ? "" : "s"} verificada
              {data.total === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      {/* Lista */}
      {data.list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aún no hay reseñas. ¡Sé el primero en enviar y calificar!
        </p>
      ) : (
        <div className="space-y-3">
          {data.list.map((r, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-4"
            >
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
                  year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Reseñas verificadas de clientes · {data.businessName}
      </p>
    </main>
  );
}
