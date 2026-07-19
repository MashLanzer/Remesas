"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Send,
  Users,
  Handshake,
  BarChart3,
} from "lucide-react";

const items = [
  { href: "/", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/remesas", label: "Remesas", icon: Send },
  { href: "/agenda", label: "Agenda", icon: Users },
  { href: "/socios", label: "Socios", icon: Handshake },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
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
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                active ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
