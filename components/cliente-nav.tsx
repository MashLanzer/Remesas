"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Gift, Package, Star, Send, Users, Plus, ChevronRight } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { OrderForm } from "@/components/order-form";
import { VaquitaForm } from "@/components/vaquita-create";
import { useT } from "@/components/lang-provider";
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
  const t = useT();
  const [saver, setSaver] = useState(false);
  const [choose, setChoose] = useState(false);
  const [enviar, setEnviar] = useState(false);
  const [vaquita, setVaquita] = useState(false);

  useEffect(() => {
    setSaver(document.documentElement.classList.contains("data-saver"));
  }, []);

  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background [transform:translateZ(0)] [will-change:transform]">
      <div className="relative mx-auto flex max-w-md items-stretch justify-around">
        {left.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} saver={saver} t={t} />
        ))}

        {/* Hueco para el FAB */}
        <div className="w-16 shrink-0" aria-hidden />

        {right.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} saver={saver} t={t} />
        ))}

        {/* FAB central: abre el selector (remesa o vaquita) */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={() => setChoose(true)}
            aria-label={t("Enviar")}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-90"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Selector: ¿remesa o vaquita? */}
      <Sheet
        open={choose}
        onClose={() => setChoose(false)}
        title={t("¿Qué quieres hacer?")}
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setChoose(false);
              setEnviar(true);
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Send className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                {t("Enviar una remesa")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("Tú envías el dinero a tu familia")}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => {
              setChoose(false);
              setVaquita(true);
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                {t("Vaquita familiar")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("Junten entre varios para un mismo envío")}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </Sheet>

      <Sheet
        open={enviar}
        onClose={() => setEnviar(false)}
        title={t("Enviar una remesa")}
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

      <Sheet
        open={vaquita}
        onClose={() => setVaquita(false)}
        title={t("Nueva vaquita familiar")}
      >
        <VaquitaForm />
      </Sheet>
    </nav>
  );
}

function NavItem({
  item,
  pathname,
  saver,
  t,
}: {
  item: (typeof items)[number];
  pathname: string;
  saver: boolean;
  t: (es: string) => string;
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
      {t(item.label)}
    </Link>
  );
}
