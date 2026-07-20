import Link from "next/link";
import { Settings } from "lucide-react";

export function TopBar({ email }: { email?: string | null }) {
  const initial = (email || "?").charAt(0).toUpperCase();
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">
            R
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Remesas
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/ajustes"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
            aria-label="Ajustes"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <span
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
            title={email || ""}
          >
            {initial}
          </span>
        </div>
      </div>
    </header>
  );
}
