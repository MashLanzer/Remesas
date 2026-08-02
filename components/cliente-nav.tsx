"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Gift, Package, Star, Send } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { OrderForm } from "@/components/order-form";
import type { ExchangeRate } from "@/lib/types";

const items = [
  { href: "/c", label: "Inicio", icon: Home, exact: true },
  { href: "/c/tienda", label: "Paquetes", icon: Gift },
  { href: "/c/pedidos", label: "Pedidos", icon: Package },
  { href: "/c/puntos", label: "Puntos", icon: Star },
];

export function ClienteNav({
  rates = [],
  pointsBalance = 0,
  redeemMin = 100,
  pointValue = 0.05,
  beneficiaries = [],
  transferBonusPct,
}: {
  rates?: ExchangeRate[];
  pointsBalance?: number;
  redeemMin?: number;
  pointValue?: number;
  beneficiaries?: { name: string; phone: string | null; province: string | null }[];
  transferBonusPct?: number | null;
}) {
  const pathname = usePathname();
  const [saver, setSaver] = useState(false);
  const [enviar, setEnviar] = useState(false);

  useEffect(() => {
    setSaver(document.documentElement.classList.contains("data-saver"));
  }, []);

  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-md items-stretch justify-around">
        {left.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} saver={saver} />
        ))}

        {/* Hueco para el FAB */}
        <div className="w-16 shrink-0" aria-hidden />

        {right.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} saver={saver} />
        ))}

        {/* FAB central: enviar remesa (abre en sheet) */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={() => setEnviar(true)}
            aria-label="Enviar remesa"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-90"
          >
            <Send className="h-6 w-6" />
          </button>
        </div>
      </div>

      <Sheet
        open={enviar}
        onClose={() => setEnviar(false)}
        title="Enviar una remesa"
      >
        <OrderForm
          rates={rates}
          onDone={() => setEnviar(false)}
          pointsBalance={pointsBalance}
          redeemMin={redeemMin}
          pointValue={pointValue}
          beneficiaries={beneficiaries}
          transferBonusPct={transferBonusPct}
        />
      </Sheet>
    </nav>
  );
}

function NavItem({
  item,
  pathname,
  saver,
}: {
  item: (typeof items)[number];
  pathname: string;
  saver: boolean;
}) {
  const active = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
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
}
