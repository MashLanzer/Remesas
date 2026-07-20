import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  Plus,
  Send,
} from "lucide-react";
import {
  getBeneficiary,
  getClient,
  getClients,
  getRemittances,
} from "@/lib/data";
import { usd, formatDate } from "@/lib/utils";
import { Card, Badge } from "@/components/ui";
import { ContactActions } from "@/components/contact-actions";
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

  const [client, beneficiary, allRemittances, clients] = await Promise.all([
    isClient ? getClient(id) : Promise.resolve(null),
    !isClient ? getBeneficiary(id) : Promise.resolve(null),
    getRemittances(),
    !isClient ? getClients() : Promise.resolve([]),
  ]);

  const contact = isClient ? client : beneficiary;
  if (!contact) notFound();

  const remesas = allRemittances.filter((r) =>
    isClient ? r.client_id === id : r.beneficiary_id === id
  );
  const count = remesas.length;
  const totalSent = remesas.reduce((s, r) => s + Number(r.amount_usd), 0);
  const totalProfit = remesas.reduce((s, r) => s + Number(r.total_profit), 0);

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
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
          {initial}
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isClient ? "Cliente" : "Beneficiario"}
            {!isClient && beneficiary?.province ? ` · ${beneficiary.province}` : ""}
          </p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-2">
        <QuickAction
          href={nuevaHref}
          icon={<Plus className="h-5 w-5" />}
          label="Nueva remesa"
        />
        {phoneDigits ? (
          <QuickAction
            href={`https://wa.me/${phoneDigits}`}
            icon={<MessageCircle className="h-5 w-5" />}
            label="WhatsApp"
            external
          />
        ) : (
          <QuickAction disabled icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp" />
        )}
        {phone ? (
          <QuickAction
            href={`tel:${phone}`}
            icon={<Phone className="h-5 w-5" />}
            label="Llamar"
            external
          />
        ) : (
          <QuickAction disabled icon={<Phone className="h-5 w-5" />} label="Llamar" />
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Remesas" value={String(count)} />
        <Stat label="Enviado" value={usd(totalSent)} />
        <Stat label="Ganancia" value={usd(totalProfit)} tone />
      </div>

      {/* Datos */}
      <Card className="space-y-2.5">
        <Row label="Teléfono" value={phone || "—"} />
        {isClient ? (
          <Row label="País" value={client?.country || "—"} />
        ) : (
          <>
            <Row label="Provincia" value={beneficiary?.province || "—"} />
            <Row
              label="Moneda preferida"
              value={beneficiary?.preferred_currency || "—"}
            />
            <Row label="Carnet (CI)" value={beneficiary?.id_card || "—"} />
          </>
        )}
      </Card>

      <ContactActions
        kind={kind}
        client={client ?? undefined}
        beneficiary={beneficiary ?? undefined}
        clients={clients}
      />

      {/* Sus remesas */}
      <div>
        <h2 className="mb-2 text-sm font-bold text-foreground">
          Remesas ({count})
        </h2>
        {count === 0 ? (
          <Card className="text-center text-sm text-muted-foreground">
            Aún no hay remesas con este contacto.
          </Card>
        ) : (
          <div className="space-y-2">
            {remesas.map((r) => (
              <Link key={r.id} href={`/remesas/${r.id}`}>
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
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
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
