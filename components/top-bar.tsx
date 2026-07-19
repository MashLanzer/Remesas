import Link from "next/link";
import { Settings } from "lucide-react";

export function TopBar({ email }: { email?: string | null }) {
  const initial = (email || "?").charAt(0).toUpperCase();
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            R
          </span>
          <span className="text-sm font-semibold text-slate-900">Remesas</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/ajustes"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Ajustes"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600"
            title={email || ""}
          >
            {initial}
          </span>
        </div>
      </div>
    </header>
  );
}
