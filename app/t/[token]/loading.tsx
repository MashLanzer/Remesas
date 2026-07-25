// Skeleton del seguimiento público mientras carga.
export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-background px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-xl bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="mb-5 h-32 animate-pulse rounded-3xl bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    </main>
  );
}
