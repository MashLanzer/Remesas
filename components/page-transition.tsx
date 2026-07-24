"use client";

import { usePathname } from "next/navigation";

// Anima un fade-up en cada cambio de pestaña (se remonta al cambiar la ruta).
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  );
}
