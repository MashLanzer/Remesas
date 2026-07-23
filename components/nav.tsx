"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Send,
  Users,
  Wallet,
  Plus,
  UserPlus,
  Megaphone,
  Boxes,
  X,
} from "lucide-react";
import { Sheet } from "@/components/sheet";
import { ContactForm } from "@/components/contact-form";

const items = [
  { href: "/", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/remesas", label: "Remesas", icon: Send },
  { href: "/agenda", label: "Agenda", icon: Users },
  { href: "/finanzas", label: "Finanzas", icon: Wallet },
];

export function BottomNav({ isOperador = true }: { isOperador?: boolean } = {}) {
  const pathname = usePathname();
  const [saver, setSaver] = useState(false);
  const [menu, setMenu] = useState(false);
  const [contact, setContact] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSaver(document.documentElement.classList.contains("data-saver"));
  }, []);

  useEffect(() => {
    if (!menu) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menu]);

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

        {/* FAB central + menú de creación */}
        <div
          ref={ref}
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
        >
          {menu && (
            <div className="absolute bottom-16 left-1/2 w-44 -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <FabLink
                href="/remesas/nueva"
                icon={<Send className="h-4 w-4" />}
                label="Nueva remesa"
                onClick={() => setMenu(false)}
              />
              <button
                onClick={() => {
                  setMenu(false);
                  setContact(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <span className="text-primary">
                  <UserPlus className="h-4 w-4" />
                </span>
                Nuevo cliente
              </button>
              {isOperador && (
                <>
                  <FabLink
                    href="/paquetes"
                    icon={<Boxes className="h-4 w-4" />}
                    label="Nuevo paquete"
                    onClick={() => setMenu(false)}
                  />
                  <FabLink
                    href="/ofertas"
                    icon={<Megaphone className="h-4 w-4" />}
                    label="Nueva promoción"
                    onClick={() => setMenu(false)}
                  />
                </>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="Crear"
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-90",
              menu && "rotate-45"
            )}
          >
            {menu ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Formulario de nuevo contacto en un sheet */}
      <Sheet
        open={contact}
        onClose={() => setContact(false)}
        title="Nuevo contacto"
      >
        <p className="mb-4 -mt-2 text-xs text-muted-foreground">
          Crea el cliente y, si quieres, su beneficiario en Cuba.
        </p>
        <ContactForm onDone={() => setContact(false)} />
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

function FabLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </Link>
  );
}
