import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Plus,
  Send,
  User,
  ChevronRight,
  Repeat,
  Clock,
} from "lucide-react";
import {
  getBeneficiaries,
  getBeneficiary,
  getClient,
  getClients,
  getRemittances,
} from "@/lib/data";
import { usd, formatDate } from "@/lib/utils";
import { Card, Badge } from "@/components/ui";
import { ContactActions } from "@/components/contact-actions";
import { ContactTopActions } from "@/components/contact-top-actions";
import { QuickNote } from "@/components/quick-note";
import type { RemittanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusTone: Record<RemittanceStatus, "amber" | "emerald" | "blue"> = {
  pendiente: "amber",
  entregado: "emerald",
  liquidado: "blue",
};

export default async function ContactoPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (kind !== "cliente" && kind !== "beneficiario") notFound();
  const isClient = kind === "cliente";

  const [client, beneficiary, allRemittances, clients, allBeneficiaries] =
    await Promise.all([
      isClient ? getClient(id) : Promise.resolve(null),
      !isClient ? getBeneficiary(id) : Promise.resolve(null),
      getRemittances(),
      getClients(),
      isClient ? getBeneficiaries() : Promise.resolve([]),
    ]);

  const contact = isClient ? client : beneficiary;
  if (!contact) notFound();

  const remesas = allRemittances.filter((r) =>
    isClient ? r.client_id === id : r.beneficiary_id === id
  );
  const count = remesas.length;
  const totalSent = remesas.reduce((s, r) => s + Number(r.amount_usd), 0);

  // Ritmo de envío: última remesa y frecuencia promedio.
  const dates = remesas.map((r) => r.date).filter(Boolean).sort(); // asc
  const newest = dates[dates.length - 1];
  const oldest = dates[0];
  const dayMs = 86400000;
  const daysSince = newest
    ? Math.floor((Date.now() - new Date(newest + "T00:00:00").getTime()) / dayMs)
    : null;
  const avgGap =
    dates.length >= 2
      ? Math.round(
          (new Date(newest + "T00:00:00").getTime() -
            new Date(oldest + "T00:00:00").getTime()) /
            dayMs /
            (dates.length - 1)
        )
      : null;
  const totalProfit = remesas.reduce((s, r) => s + Number(r.total_profit), 0);
  const owed = remesas
    .filter((r) => r.client_paid === false)
    .reduce((s, r) => s + Number(r.total_received), 0);

  // Vínculos
  const associatedBenefs = isClient
    ? allBeneficiaries.filter((b) => b.client_id === id)
    : [];
  const associatedClient =
    !isClient && beneficiary?.client_id
      ? clients.find((c) => c.id === beneficiary.client_id) ?? null
      : null;

  const phone = contact.phone ?? null;
  const phoneDigits = phone?.replace(/\D/g, "");
  const name = contact.name;
  const initial = name.charAt(0).toUpperCase();

  const nuevaHref = isClient
    ? `/remesas/nueva?cliente=${id}`
    : `/remesas/nueva?beneficiario=${id}`;

  return (
    <div className="space-y-5">
      <Link
        href="/agenda"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Agenda
      </Link>

      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
              {name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isClient ? "Cliente" : "Beneficiario"}
              {!isClient && beneficiary?.province
                ? ` · ${beneficiary.province}`
                : ""}
            </p>
          </div>
        </div>
        <ContactTopActions
          kind={kind}
          id={id}
          pinned={!!contact.pinned}
          name={name}
          phone={phone}
        />
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-2">
        <QuickAction href={nuevaHref} icon={<Plus className="h-5 w-5" />} label="Nueva remesa" />
        {phoneDigits ? (
          <QuickAction href={`https://wa.me/${phoneDigits}`} icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp" external />
        ) : (
          <QuickAction disabled icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp" />
        )}
        {phone ? (
          <QuickAction href={`tel:${phone}`} icon={<Phone className="h-5 w-5" />} label="Llamar" external />
        ) : (
          <QuickAction disabled icon={<Phone className="h-5 w-5" />} label="Llamar" />
        )}
      </div>

      {/* Repetir última remesa (clientes recurrentes): copia todos los datos. */}
      {remesas.length > 0 && (
        <Link href={`/remesas/nueva?dup=${remesas[0].id}`} className="block">
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 py-3 text-sm font-semibold text-primary transition active:scale-[0.98]">
            <Repeat className="h-4 w-4" /> Repetir última remesa ·{" "}
            {usd(remesas[0].amount_usd)}
          </div>
        </Link>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Remesas" value={String(count)} />
        <Stat label="Enviado" value={usd(totalSent)} />
        <Stat label="Ganancia" value={usd(totalProfit)} tone />
      </div>

      {/* Ritmo de envío */}
      {count > 0 && daysSince !== null && (
        <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Última remesa:{" "}
          {daysSince === 0
            ? "hoy"
            : `hace ${daysSince} día${daysSince > 1 ? "s" : ""}`}
          {avgGap ? ` · envía cada ~${avgGap} día${avgGap > 1 ? "s" : ""}` : ""}
        </p>
      )}

      {/* Por cobrar (clientes) */}
      {isClient && owed > 0 && (
        <Card className="space-y-3 border-warning/30 bg-warning/10">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-warning">Te debe</p>
            <p className="tabular text-lg font-bold text-warning">{usd(owed)}</p>
          </div>
          {phoneDigits && (
            <a
              href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                `Hola ${name}, te recuerdo que tienes un saldo pendiente de ${usd(
                  owed
                )} por tus remesas. ¡Gracias!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-warning py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4" /> Recordar por WhatsApp
            </a>
          )}
        </Card>
      )}

      {/* Datos */}
      <Card className="space-y-2.5">
        <Row label="Teléfono" value={phone || "—"} />
        {isClient ? (
          <Row label="País" value={client?.country || "—"} />
        ) : (
          <>
            <Row label="Provincia" value={beneficiary?.province || "—"} />
            <Row label="Moneda preferida" value={beneficiary?.preferred_currency || "—"} />
            <Row label="Cómo recibe" value={beneficiary?.preferred_delivery || "—"} />
            <Row label="Carnet (CI)" value={beneficiary?.id_card || "—"} />
            {associatedClient && (
              <Link
                href={`/agenda/cliente/${associatedClient.id}`}
                className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-primary"
              >
                <User className="h-3.5 w-3.5" /> Cliente: {associatedClient.name}
              </Link>
            )}
          </>
        )}
      </Card>

      {/* Nota rápida */}
      <QuickNote kind={kind} id={id} notes={contact.notes} />

      {/* Beneficiarios asociados (clientes) */}
      {isClient && associatedBenefs.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold text-foreground">
            Beneficiarios ({associatedBenefs.length})
          </h2>
          <div className="space-y-2">
            {associatedBenefs.map((b) => (
              <Link key={b.id} href={`/agenda/beneficiario/${b.id}`} className="block">
                <Card className="flex items-center gap-3 p-3 transition active:scale-[0.99]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {b.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {b.name}
                    </p>
                    {b.province && (
                      <p className="truncate text-xs text-muted-foreground">
                        {b.province}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <ContactActions
        kind={kind}
        client={client ?? undefined}
        beneficiary={beneficiary ?? undefined}
        clients={clients}
      />

      {/* Sus remesas */}
      <div>
        <h2 className="mb-2 text-sm font-bold text-foreground">Remesas ({count})</h2>
        {count === 0 ? (
          <Card className="text-center text-sm text-muted-foreground">
            Aún no hay remesas con este contacto.
          </Card>
        ) : (
          <div className="space-y-2">
            {remesas.map((r) => (
              <Link key={r.id} href={`/remesas/${r.id}`} className="block">
                <Card className="flex items-center justify-between p-3.5 transition active:scale-[0.99]">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Send className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="tabular truncate text-sm font-semibold text-foreground">
                        {usd(r.amount_usd)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.date)}
                      </p>
                    </div>
                  </div>
                  <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  external,
  disabled,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
  disabled?: boolean;
}) {
  const inner = (
    <div
      className={
        "flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card py-3 text-primary transition active:scale-95 " +
        (disabled ? "opacity-40" : "")
      }
    >
      {icon}
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
  if (disabled || !href) return inner;
  if (external)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  return <Link href={href}>{inner}</Link>;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: boolean;
}) {
  return (
    <Card className="p-3 text-center">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={
          "tabular mt-0.5 text-base font-bold " +
          (tone ? "text-income" : "text-foreground")
        }
      >
        {value}
      </p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
