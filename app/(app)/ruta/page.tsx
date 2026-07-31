import Link from "next/link";
import {
  Route,
  MapPin,
  MessageCircle,
  Phone,
  ChevronRight,
  Navigation,
  Truck,
} from "lucide-react";
import { getRemittances } from "@/lib/data";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { usd, localAmount } from "@/lib/utils";
import type { Remittance } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapsUrl(address: string | null | undefined, province: string | null | undefined) {
  const q = [address, province, "Cuba"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default async function RutaPage() {
  const remittances = await getRemittances();
  const pend = remittances.filter((r) => r.status === "pendiente");

  // Agrupar por provincia; las que no tienen provincia van al final.
  const groups = new Map<string, Remittance[]>();
  for (const r of pend) {
    const prov = r.beneficiary?.province?.trim() || "Sin provincia";
    const arr = groups.get(prov);
    if (arr) arr.push(r);
    else groups.set(prov, [r]);
  }
  const ordered = Array.from(groups.entries()).sort((a, b) => {
    // "Sin provincia" siempre al final; el resto por nº de entregas desc.
    if (a[0] === "Sin provincia") return 1;
    if (b[0] === "Sin provincia") return -1;
    return b[1].length - a[1].length;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Ruta de hoy" icon={Route} />

      {pend.length === 0 ? (
        <EmptyState
          title="Sin entregas pendientes"
          description="Cuando tengas remesas por entregar, aquí verás tu ruta agrupada por zona."
        />
      ) : (
        <>
          <Card className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {pend.length} entrega{pend.length === 1 ? "" : "s"} por hacer
              </p>
              <p className="text-xs text-muted-foreground">
                En {ordered.length} zona{ordered.length === 1 ? "" : "s"} · toca
                una para abrirla en el mapa
              </p>
            </div>
          </Card>

          {ordered.map(([province, list]) => (
            <section key={province} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> {province}
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {list.length}
                </span>
              </div>
              <div className="space-y-2">
                {list.map((r) => (
                  <DeliveryRow key={r.id} r={r} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function DeliveryRow({ r }: { r: Remittance }) {
  const b = r.beneficiary;
  const phone = b?.phone?.replace(/\D/g, "") || "";
  const address = b?.address || null;

  return (
    <Card className="space-y-2.5">
      <Link href={`/remesas/${r.id}`} className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {b?.name || "Beneficiario"}
          </p>
          {address ? (
            <p className="truncate text-xs text-muted-foreground">{address}</p>
          ) : (
            <p className="text-xs italic text-muted-foreground/70">
              Sin dirección
            </p>
          )}
          {r.en_route_at && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info">
              <Navigation className="h-3 w-3" /> En camino
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-right">
            <span className="block text-sm font-bold tabular-nums text-foreground">
              {localAmount(r.local_amount)} {r.delivery_currency}
            </span>
            <span className="block text-[10px] text-muted-foreground">
              {usd(r.amount_usd)}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-2 border-t border-border pt-2.5">
        {address || b?.province ? (
          <a
            href={mapsUrl(address, b?.province)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 rounded-lg bg-info/10 py-2 text-xs font-semibold text-info transition active:scale-95"
          >
            <MapPin className="h-4 w-4" /> Mapa
          </a>
        ) : (
          <span className="flex items-center justify-center gap-1 rounded-lg bg-muted py-2 text-xs font-semibold text-muted-foreground opacity-50">
            <MapPin className="h-4 w-4" /> Mapa
          </span>
        )}
        {phone ? (
          <a
            href={`https://wa.me/${phone}?text=${encodeURIComponent(
              `Hola${b?.name ? ` ${b.name}` : ""}, voy en camino con tu remesa.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 rounded-lg bg-income/10 py-2 text-xs font-semibold text-income transition active:scale-95"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        ) : (
          <span className="flex items-center justify-center gap-1 rounded-lg bg-muted py-2 text-xs font-semibold text-muted-foreground opacity-50">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </span>
        )}
        {phone ? (
          <a
            href={`tel:${b?.phone?.replace(/[^\d+]/g, "")}`}
            className="flex items-center justify-center gap-1 rounded-lg bg-primary/10 py-2 text-xs font-semibold text-primary transition active:scale-95"
          >
            <Phone className="h-4 w-4" /> Llamar
          </a>
        ) : (
          <span className="flex items-center justify-center gap-1 rounded-lg bg-muted py-2 text-xs font-semibold text-muted-foreground opacity-50">
            <Phone className="h-4 w-4" /> Llamar
          </span>
        )}
      </div>
    </Card>
  );
}
