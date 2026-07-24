"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Card } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { recordOfferView } from "@/app/actions";
import { cn } from "@/lib/utils";
import { EnviarRemesaCta } from "@/components/enviar-remesa-cta";
import { OFFER_KINDS, type Offer, type ExchangeRate } from "@/lib/types";

type SendProps = {
  rates: ExchangeRate[];
  pointsBalance: number;
  redeemMin: number;
  pointValue: number;
  beneficiaries: { name: string; phone: string | null; province: string | null }[];
};

function kindMeta(o: Offer) {
  const k = OFFER_KINDS.find((x) => x.key === o.kind);
  return { emoji: o.emoji || k?.emoji || "📣", label: k?.label ?? "Anuncio" };
}

function fmt(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function validity(o: Offer): string | null {
  if (o.ends_at) return `Válido hasta ${fmt(o.ends_at)}`;
  if (o.starts_at) return `Desde ${fmt(o.starts_at)}`;
  return null;
}

export function OffersView({
  offers,
  sendProps,
}: {
  offers: Offer[];
  sendProps?: SendProps;
}) {
  const [selected, setSelected] = useState<Offer | null>(null);

  if (offers.length === 0) return null;

  function open(o: Offer) {
    setSelected(o);
    // Registrar la vista (tolerante si el RPC aún no existe).
    recordOfferView(o.id).catch(() => {});
  }

  // La destacada se muestra como banner grande; el resto como lista.
  const banner = offers[0]?.featured ? offers[0] : null;
  const list = banner ? offers.slice(1) : offers;

  return (
    <div className="space-y-3">
      {banner && (
        <button
          onClick={() => open(banner)}
          className="block w-full text-left"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 text-white shadow-lg transition active:scale-[0.99]">
            {banner.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner.image_url}
                alt=""
                className="h-40 w-full object-cover"
              />
            ) : null}
            <div className="relative p-5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur">
                <Star className="h-3 w-3 fill-white" /> Destacada
              </span>
              <p className="mt-3 flex items-center gap-2 text-2xl font-extrabold leading-tight">
                {!banner.image_url && <span>{kindMeta(banner).emoji}</span>}
                {banner.title}
              </p>
              {banner.description && (
                <p className="mt-1 line-clamp-2 text-sm text-white/85">
                  {banner.description}
                </p>
              )}
              {validity(banner) && (
                <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {validity(banner)}
                </p>
              )}
            </div>
          </div>
        </button>
      )}

      {list.map((o) => {
        const m = kindMeta(o);
        const v = validity(o);
        return (
          <button
            key={o.id}
            onClick={() => open(o)}
            className="block w-full text-left"
          >
            <Card
              className={cn(
                "overflow-hidden p-0 transition active:scale-[0.99]",
                o.featured && "border-primary/40 ring-1 ring-primary/20"
              )}
            >
              {o.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={o.image_url}
                  alt=""
                  className="h-36 w-full object-cover"
                />
              )}
              <div className="flex gap-3 p-3.5">
                {!o.image_url && (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                    {m.emoji}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {o.featured && (
                      <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />
                    )}
                    <p className="truncate text-sm font-bold text-foreground">
                      {o.title}
                    </p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {m.label}
                    </span>
                  </div>
                  {o.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {o.description}
                    </p>
                  )}
                  {v && (
                    <p className="mt-1 text-[11px] font-medium text-primary">{v}</p>
                  )}
                </div>
              </div>
            </Card>
          </button>
        );
      })}

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
      >
        {selected && (
          <div className="space-y-3">
            {selected.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.image_url}
                alt=""
                className="w-full rounded-2xl object-cover"
              />
            )}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{kindMeta(selected).emoji}</span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {kindMeta(selected).label}
              </span>
            </div>
            {selected.description && (
              <p className="whitespace-pre-line text-sm text-foreground">
                {selected.description}
              </p>
            )}
            {validity(selected) && (
              <p className="text-xs font-medium text-primary">
                {validity(selected)}
              </p>
            )}
            {sendProps && (
              <EnviarRemesaCta
                rates={sendProps.rates}
                pointsBalance={sendProps.pointsBalance}
                redeemMin={sendProps.redeemMin}
                pointValue={sendProps.pointValue}
                beneficiaries={sendProps.beneficiaries}
                variant="primary"
                label="Enviar con esta promo"
                initial={{ note: `Promo: ${selected.title}` }}
              />
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
