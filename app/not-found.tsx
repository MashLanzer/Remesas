import Link from "next/link";
import { Home } from "lucide-react";
import { PaperPlane } from "@/components/paper-plane";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <PaperPlane className="h-8 w-8 -translate-x-0.5" />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-foreground">
        No encontramos esta página
      </h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        El enlace puede estar vencido o escrito de otra forma. Vuelve al inicio
        y sigue desde ahí.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-[0.98]"
      >
        <Home className="h-4 w-4" /> Ir al inicio
      </Link>
    </main>
  );
}
