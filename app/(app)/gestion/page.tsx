import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Boxes, Megaphone, Inbox, Bell, Users, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getOffers,
  getPackages,
  getOrders,
  getSessionContext,
  getAnnouncements,
} from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GestionPage() {
  const ctx = await getSessionContext();
  if (!ctx.isOperador) redirect("/");

  const [offers, packages, pending, announcements] = await Promise.all([
    getOffers(),
    getPackages(),
    getOrders({ pendingOnly: true }),
    getAnnouncements(),
  ]);

  return (
    <div>
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>
      <PageHeader
        title="Gestión"
        subtitle="Paquetes, promociones y pedidos de tus clientes"
      />
      <div className="space-y-3">
        <HubCard
          href="/paquetes"
          icon={Boxes}
          title="Paquetes de remesa"
          subtitle={`${packages.length} publicado${packages.length === 1 ? "" : "s"}`}
        />
        <HubCard
          href="/ofertas"
          icon={Megaphone}
          title="Promociones"
          subtitle={`${offers.length} publicada${offers.length === 1 ? "" : "s"}`}
        />
        <HubCard
          href="/pedidos"
          icon={Inbox}
          title="Pedidos de clientes"
          subtitle={
            pending.length > 0
              ? `${pending.length} nuevo${pending.length === 1 ? "" : "s"} por atender`
              : "Sin pedidos nuevos"
          }
          highlight={pending.length > 0}
        />
        <HubCard
          href="/anuncios"
          icon={Bell}
          title="Anuncios a clientes"
          subtitle={
            announcements.length > 0
              ? `${announcements.length} publicado${
                  announcements.length === 1 ? "" : "s"
                }`
              : "Publica avisos en la app del cliente"
          }
        />
        <HubCard
          href="/vaquitas"
          icon={Users}
          title="Vaquitas familiares"
          subtitle="Botes que juntan varios para un envío"
        />
      </div>
    </div>
  );
}

function HubCard({
  href,
  icon: Icon,
  title,
  subtitle,
  highlight = false,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card
        className={cn(
          "flex items-center gap-3 p-4 transition active:scale-[0.99]",
          highlight && "border-primary/30 bg-primary/5"
        )}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{title}</p>
          <p
            className={cn(
              "truncate text-xs",
              highlight ? "font-semibold text-primary" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Card>
    </Link>
  );
}
