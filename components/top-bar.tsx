import Link from "next/link";
import { Settings, Bell } from "lucide-react";

export function TopBar({
  email,
  alertCount = 0,
}: {
  email?: string | null;
  alertCount?: number;
}) {
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
            href="/notificaciones"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </Link>
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
