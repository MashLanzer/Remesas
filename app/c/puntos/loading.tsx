export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-28 animate-pulse rounded bg-muted" />
      <div className="h-32 animate-pulse rounded-3xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
