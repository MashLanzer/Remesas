import Link from "next/link";
import { MessageSquareQuote, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import { StarRating } from "@/components/star-rating";
import type { ReviewItem } from "@/lib/data";

// Vista privada del operador: reputación del negocio + enlace a la página pública.
export function OperatorReviewsCard({
  avg,
  total,
  recent,
  code,
}: {
  avg: number;
  total: number;
  recent: ReviewItem[];
  code: string | null;
}) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquareQuote className="h-6 w-6" />
          </span>
          <div>
            <p className="tabular text-xl font-extrabold text-foreground">
              {total > 0 ? avg.toFixed(1) : "—"}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                / 5
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {total} reseña{total === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {total > 0 && <StarRating value={avg} size="md" />}
      </div>

      {recent.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          {recent.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <StarRating value={r.rating} />
              {r.comment && (
                <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {r.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {code && (
        <Link
          href={`/o/${code}`}
          className="flex items-center justify-center gap-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-primary transition active:scale-[0.98]"
        >
          Ver / compartir página pública <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </Card>
  );
}
