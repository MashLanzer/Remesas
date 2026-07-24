import Link from "next/link";
import { Bell, Inbox } from "lucide-react";
import { ProfileMenu } from "@/components/profile-menu";
import { PaperPlane } from "@/components/paper-plane";
import { ShareCard } from "@/components/share-card";
import { RatesHeaderButton } from "@/components/rates-header-button";
import type { ExchangeRate, RateHistory } from "@/lib/types";

export function TopBar({
  email,
  alertCount = 0,
  pendingOrders = 0,
  card,
  rates = [],
  rateHistory = [],
}: {
  email?: string | null;
  alertCount?: number;
  pendingOrders?: number;
  card?: {
    name?: string | null;
    businessName?: string | null;
    phone?: string | null;
    zelle?: string | null;
    cashapp?: string | null;
    paypal?: string | null;
  };
  rates?: ExchangeRate[];
  rateHistory?: RateHistory[];
}) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PaperPlane className="h-4 w-4 -translate-x-px" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Giro
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <RatesHeaderButton rates={rates} history={rateHistory} />
          {card && <ShareCard {...card} />}
          {pendingOrders > 0 && (
            <Link
              href="/pedidos"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
              aria-label="Pedidos pendientes"
            >
              <Inbox className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {pendingOrders > 9 ? "9+" : pendingOrders}
              </span>
            </Link>
          )}
          <Link
            href="/notificaciones"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </Link>
          <ProfileMenu email={email} />
        </div>
      </div>
    </header>
  );
}
