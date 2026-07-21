"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Send,
  Users,
  Wallet,
  BarChart3,
} from "lucide-react";

const items = [
  { href: "/", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/remesas", label: "Remesas", icon: Send },
  { href: "/agenda", label: "Agenda", icon: Users },
  { href: "/socios", label: "Cuentas", icon: Wallet },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();
  const [saver, setSaver] = useState(false);

  useEffect(() => {
    setSaver(document.documentElement.classList.contains("data-saver"));
  }, []);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={saver ? false : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition",
                  active && "bg-primary/12 text-primary"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
