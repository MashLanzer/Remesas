"use client";

import { useMemo, useState } from "react";
import { Star, Share2, Gift, Check } from "lucide-react";
import { Card } from "@/components/ui";
import { Sheet } from "@/components/sheet";
import { FavHeart } from "@/components/fav-heart";
import { useFavorites } from "@/lib/use-favorites";
import { useT } from "@/components/lang-provider";
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
  transferBonusPct?: number | null;
  commissionRules?: import("@/lib/calc").CommissionRules;
};

type ReferralProps = { code: string | null; bonus: number };

function kindMeta(o: Offer, tr: (es: string) => string) {
  const k = OFFER_KINDS.find((x) => x.key === o.kind);
  return { emoji: o.emoji || k?.emoji || "📣", label: k?.label ?? tr("Anuncio") };
}

// Texto del botón de acción según el tipo de promoción.
function ctaLabel(o: Offer, tr: (es: string) => string): string {
  switch (o.kind) {
    case "tasa":
      return tr("Enviar con esta tasa");
    case "sin_comision":
      return tr("Enviar sin comisión");
    case "express":
      return tr("Pedir entrega express");
    case "combo":
      return tr("Pedir este combo");
    default:
      return tr("Enviar con esta promo");
  }
}

function fmt(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function validity(o: Offer, tr: (es: string) => string): string | null {
  if (o.ends_at) return `${tr("Válido hasta")} ${fmt(o.ends_at)}`;
  if (o.starts_at) return `${tr("Desde")} ${fmt(o.starts_at)}`;
  return null;
}

export function OffersView({
  offers,
  sendProps,
  referral,
}: {
  offers: Offer[];
  sendProps?: SendProps;
  referral?: ReferralProps | null;
}) {
  const tr = useT();
  const [selected, setSelected] = useState<Offer | null>(null);
  const [copied, setCopied] = useState(false);
  const { isFav, toggle } = useFavorites("offers");

  // La destacada se muestra como banner grande; el resto como lista, con los
  // favoritos del cliente arriba (orden estable).
  const banner = offers[0]?.featured ? offers[0] : null;
  const rest = banner ? offers.slice(1) : offers;
  const list = useMemo(
    () =>
      rest
        .map((o, i) => ({ o, i }))
        .sort(
          (a, b) =>
            (isFav(b.o.id) ? 1 : 0) - (isFav(a.o.id) ? 1 : 0) || a.i - b.i
        )
        .map((x) => x.o),
    [rest, isFav]
  );

  if (offers.length === 0) return null;

  const refLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return referral?.code ? `${origin}/r/${referral.code}` : "";
  };

  async function shareReferral() {
    const url = refLink();
    if (!url) return;
    const text = `${tr("Te invito a Giro para enviar remesas a Cuba. Regístrate con mi enlace y los dos ganamos")} ${referral?.bonus ?? 50} ${tr("puntos")}: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: tr("Únete a Giro"), text, url });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nada */
    }
  }

  function open(o: Offer) {
    setSelected(o);
    // Registrar la vista (tolerante si el RPC aún no existe).
    recordOfferView(o.id).catch(() => {});
  }

  return (
    <div className="space-y-3">
      {banner && (
        <button
          onClick={() => open(banner)}
          className="block w-full text-left"
        >
          <div className="hero-gradient relative overflow-hidden rounded-3xl text-white shadow-lg transition active:scale-[0.99]">
            <div className="absolute right-3 top-3 z-10">
              <FavHeart
                active={isFav(banner.id)}
                onToggle={() => toggle(banner.id)}
                className="bg-white/20 text-white backdrop-blur hover:text-white"
              />
            </div>
            {banner.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner.image_url}
                alt={banner.title || tr("Oferta")}
                className="h-40 w-full object-cover"
              />
            ) : null}
            <div className="relative p-5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur">
                <Star className="h-3 w-3 fill-white" /> {tr("Destacada")}
              </span>
              <p className="mt-3 flex items-center gap-2 text-2xl font-extrabold leading-tight">
                {!banner.image_url && <span>{kindMeta(banner, tr).emoji}</span>}
                {banner.title}
              </p>
              {banner.description && (
                <p className="mt-1 line-clamp-2 text-sm text-white/85">
                  {banner.description}
                </p>
              )}
              {validity(banner, tr) && (
                <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {validity(banner, tr)}
                </p>
              )}
            </div>
          </div>
        </button>
      )}

      {list.map((o) => {
        const m = kindMeta(o, tr);
        const v = validity(o, tr);
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
                  alt={o.title || tr("Oferta")}
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
                <FavHeart active={isFav(o.id)} onToggle={() => toggle(o.id)} />
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
                alt={selected.title || tr("Oferta")}
                className="w-full rounded-2xl object-cover"
              />
            )}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{kindMeta(selected, tr).emoji}</span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {kindMeta(selected, tr).label}
              </span>
            </div>
            {selected.description && (
              <p className="whitespace-pre-line text-sm text-foreground">
                {selected.description}
              </p>
            )}
            {validity(selected, tr) && (
              <p className="text-xs font-medium text-primary">
                {validity(selected, tr)}
              </p>
            )}
            {selected.kind === "bono" && referral?.code ? (
              // Promo de referido: mostrar el enlace real de invitación.
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={shareReferral}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> {tr("Enlace copiado")}
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" /> {tr("Invitar a un amigo")}
                    </>
                  )}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                  <Gift className="h-3.5 w-3.5" /> {tr("Cuando tu amigo reciba su primer envío, ganan")}{" "}
                  {referral.bonus} {tr("puntos cada uno.")}
                </p>
              </div>
            ) : (
              sendProps && (
                <EnviarRemesaCta
                  rates={sendProps.rates}
                  pointsBalance={sendProps.pointsBalance}
                  redeemMin={sendProps.redeemMin}
                  pointValue={sendProps.pointValue}
                  beneficiaries={sendProps.beneficiaries}
                  transferBonusPct={sendProps.transferBonusPct}
                  commissionRules={sendProps.commissionRules}
                  variant="primary"
                  label={ctaLabel(selected, tr)}
                  initial={{ note: `Promo: ${selected.title}` }}
                />
              )
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
