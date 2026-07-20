"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight, Pin } from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Field,
  Input,
  Select,
  Textarea,
  EmptyState,
} from "@/components/ui";
import { createClientRecord, createBeneficiary } from "@/app/actions";
import { usd, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DELIVERY_CURRENCIES, type Beneficiary, type Client } from "@/lib/types";

export type ContactStat = {
  count: number;
  total: number;
  last?: string;
  owed?: number;
};

export function AgendaView({
  clients,
  beneficiaries,
  clientStats,
  benefStats,
}: {
  clients: Client[];
  beneficiaries: Beneficiary[];
  clientStats: Record<string, ContactStat>;
  benefStats: Record<string, ContactStat>;
}) {
  const [tab, setTab] = useState<"clientes" | "beneficiarios">("clientes");
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"nombre" | "actividad">("nombre");

  const term = q.trim().toLowerCase();

  function sortFn<T extends { id: string; name: string; pinned?: boolean }>(
    stats: Record<string, ContactStat>
  ) {
    return (a: T, b: T) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap; // favoritos arriba
      if (sort === "actividad")
        return (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0);
      return a.name.localeCompare(b.name);
    };
  }

  const fClients = useMemo(() => {
    const arr = clients.filter((c) =>
      [c.name, c.phone, c.country].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
    arr.sort(sortFn(clientStats));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, term, sort, clientStats]);

  const fBeneficiaries = useMemo(() => {
    const arr = beneficiaries.filter((b) =>
      [b.name, b.phone, b.province].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
    arr.sort(sortFn(benefStats));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beneficiaries, term, sort, benefStats]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <TabButton active={tab === "clientes"} onClick={() => { setTab("clientes"); setShowForm(false); }}>
          Clientes ({clients.length})
        </TabButton>
        <TabButton active={tab === "beneficiarios"} onClick={() => { setTab("beneficiarios"); setShowForm(false); }}>
          Beneficiarios ({beneficiaries.length})
        </TabButton>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-xl border border-input bg-card px-3 py-2.5 text-xs font-medium text-foreground outline-none"
        >
          <option value="nombre">A-Z</option>
          <option value="actividad">Activos</option>
        </select>
      </div>

      <Button
        variant={showForm ? "secondary" : "primary"}
        className="mb-4 w-full"
        onClick={() => setShowForm((s) => !s)}
      >
        <Plus className="h-4 w-4" />
        {showForm ? "Cerrar" : tab === "clientes" ? "Añadir cliente" : "Añadir beneficiario"}
      </Button>

      {showForm && tab === "clientes" && <ClientForm onDone={() => setShowForm(false)} />}
      {showForm && tab === "beneficiarios" && (
        <BeneficiaryForm clients={clients} onDone={() => setShowForm(false)} />
      )}

      {tab === "clientes" ? (
        fClients.length === 0 ? (
          <EmptyState
            title={term ? "Sin resultados" : "Sin clientes"}
            description={term ? "Prueba con otro nombre." : "Añade a las personas que te pagan."}
          />
        ) : (
          <div className="space-y-2">
            {fClients.map((c) => (
              <ContactCard
                key={c.id}
                href={`/agenda/cliente/${c.id}`}
                name={c.name}
                sub={[c.phone, c.country].filter(Boolean).join(" · ")}
                pinned={c.pinned}
                stat={clientStats[c.id]}
              />
            ))}
          </div>
        )
      ) : fBeneficiaries.length === 0 ? (
        <EmptyState
          title={term ? "Sin resultados" : "Sin beneficiarios"}
          description={term ? "Prueba con otro nombre." : "Añade a quienes reciben en Cuba."}
        />
      ) : (
        <div className="space-y-2">
          {fBeneficiaries.map((b) => (
            <ContactCard
              key={b.id}
              href={`/agenda/beneficiario/${b.id}`}
              name={b.name}
              sub={[b.phone, b.province].filter(Boolean).join(" · ")}
              pinned={b.pinned}
              stat={benefStats[b.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ContactCard({
  href,
  name,
  sub,
  pinned,
  stat,
}: {
  href: string;
  name: string;
  sub: string;
  pinned?: boolean;
  stat?: ContactStat;
}) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <Link href={href} className="block">
      <Card className="flex items-center gap-3 p-3.5 transition active:scale-[0.99]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            {pinned && <Pin className="h-3 w-3 shrink-0 fill-primary text-primary" />}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {stat && stat.count > 0
              ? `${stat.count} remesa${stat.count > 1 ? "s" : ""} · ${usd(stat.total)}`
              : sub || "Sin remesas aún"}
            {stat?.last ? ` · ${formatDate(stat.last)}` : ""}
          </p>
        </div>
        {stat?.owed && stat.owed > 0 ? (
          <Badge tone="amber">Debe {usd(stat.owed)}</Badge>
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </Card>
    </Link>
  );
}

function ClientForm({ onDone }: { onDone: () => void }) {
  return (
    <Card className="mb-4">
      <form action={async (fd) => { await createClientRecord(fd); onDone(); }} className="space-y-3">
        <Field label="Nombre">
          <Input name="name" required placeholder="Nombre del cliente" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input name="phone" placeholder="+1…" />
          </Field>
          <Field label="País">
            <Input name="country" placeholder="EE.UU." />
          </Field>
        </div>
        <Field label="Notas">
          <Textarea name="notes" rows={2} />
        </Field>
        <Button type="submit" className="w-full">Guardar cliente</Button>
      </form>
    </Card>
  );
}

function BeneficiaryForm({ clients, onDone }: { clients: Client[]; onDone: () => void }) {
  return (
    <Card className="mb-4">
      <form action={async (fd) => { await createBeneficiary(fd); onDone(); }} className="space-y-3">
        <Field label="Nombre">
          <Input name="name" required placeholder="Nombre en Cuba" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input name="phone" placeholder="+53…" />
          </Field>
          <Field label="Provincia">
            <Input name="province" placeholder="La Habana" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moneda preferida">
            <Select name="preferred_currency" defaultValue="">
              <option value="">—</option>
              {DELIVERY_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cómo recibe">
            <Select name="preferred_delivery" defaultValue="">
              <option value="">—</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta CUP">Tarjeta CUP</option>
              <option value="MLC">MLC</option>
              <option value="Transferencia">Transferencia</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Carnet (CI)">
            <Input name="id_card" placeholder="Opcional" />
          </Field>
          <Field label="Cliente asociado">
            <Select name="client_id" defaultValue="">
              <option value="">— Ninguno —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Button type="submit" className="w-full">Guardar beneficiario</Button>
      </form>
    </Card>
  );
}
