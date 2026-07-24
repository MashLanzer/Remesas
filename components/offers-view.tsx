"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Card } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { recordOfferView } from "@/app/actions";
import { cn } from "@/lib/utils";
import { ContactBusiness } from "@/components/contact-business";
import { OFFER_KINDS, type Offer } from "@/lib/types";

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
  contactPhone,
  businessName,
}: {
  offers: Offer[];
  contactPhone?: string | null;
  businessName?: string | null;
}) {
  const [selected, setSelected] = useState<Offer | null>(null);

  if (offers.length === 0) return null;

  function open(o: Offer) {
    setSelected(o);
    // Registrar la vista (tolerante si el RPC aún no existe).
    recordOfferView(o.id).catch(() => {});
  }

  return (
    <div className="space-y-3">
      {offers.map((o) => {
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
            {contactPhone && (
              <ContactBusiness
                phone={contactPhone}
                businessName={businessName}
                label="Quiero esta promo"
                message={`Hola${
                  businessName ? ` ${businessName}` : ""
                }, me interesa la promoción "${selected.title}".`}
              />
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
