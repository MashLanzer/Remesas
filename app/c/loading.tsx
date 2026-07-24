export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-56 animate-pulse rounded-3xl bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="flex gap-3">
          <div className="h-28 w-40 shrink-0 animate-pulse rounded-2xl bg-muted" />
          <div className="h-28 w-40 shrink-0 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
