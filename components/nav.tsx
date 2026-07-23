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
  Plus,
  UserPlus,
  Megaphone,
  Boxes,
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

        {/* FAB central: abre el panel de creación */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-label="Crear"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-90"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Panel de creación (dashboard) en un sheet */}
      <Sheet open={menu} onClose={() => setMenu(false)} title="Crear">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/remesas/nueva" onClick={() => setMenu(false)}>
            <CreateTile
              icon={<Send className="h-5 w-5" />}
              label="Nueva remesa"
              desc="Registrar un envío"
            />
          </Link>
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              setContact(true);
            }}
            className="text-left"
          >
            <CreateTile
              icon={<UserPlus className="h-5 w-5" />}
              label="Nuevo cliente"
              desc="Agregar a la agenda"
            />
          </button>
          {isOperador && (
            <>
              <Link href="/paquetes" onClick={() => setMenu(false)}>
                <CreateTile
                  icon={<Boxes className="h-5 w-5" />}
                  label="Nuevo paquete"
                  desc="Oferta de envío lista"
                />
              </Link>
              <Link href="/ofertas" onClick={() => setMenu(false)}>
                <CreateTile
                  icon={<Megaphone className="h-5 w-5" />}
                  label="Nueva promoción"
                  desc="Anuncio para clientes"
                />
              </Link>
            </>
          )}
        </div>
      </Sheet>

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

function CreateTile({
  icon,
  label,
  desc,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.98]">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
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
