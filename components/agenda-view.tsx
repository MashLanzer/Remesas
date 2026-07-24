"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ChevronRight,
  Pin,
  Users,
  MapPin,
  Wallet,
  type LucideIcon,
} from "lucide-react";
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
import { Sheet } from "@/components/sheet";
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
  type Filter = "todos" | "deuda" | "activos" | "favoritos" | "sin_remesas";
  const [filter, setFilter] = useState<Filter>("todos");

  const term = q.trim().toLowerCase();

  function passes(
    item: { id: string; pinned?: boolean },
    stats: Record<string, ContactStat>
  ) {
    const s = stats[item.id];
    switch (filter) {
      case "deuda":
        return (s?.owed ?? 0) > 0;
      case "activos":
        return (s?.count ?? 0) > 0;
      case "favoritos":
        return !!item.pinned;
      case "sin_remesas":
        return !s?.count;
      default:
        return true;
    }
  }

  function goTab(next: "clientes" | "beneficiarios") {
    setTab(next);
    setShowForm(false);
    // "Con deuda" solo aplica a clientes.
    if (next === "beneficiarios" && filter === "deuda") setFilter("todos");
  }

  // Chips de filtro (el de deuda solo en clientes).
  const chips: { key: Filter; label: string }[] = [
    { key: "todos", label: "Todos" },
    ...(tab === "clientes"
      ? ([{ key: "deuda", label: "Con deuda" }] as { key: Filter; label: string }[])
      : []),
    { key: "activos", label: "Activos" },
    { key: "favoritos", label: "Favoritos" },
    { key: "sin_remesas", label: "Sin remesas" },
  ];

  const totalOwed = useMemo(
    () => Object.values(clientStats).reduce((s, st) => s + (st.owed ?? 0), 0),
    [clientStats]
  );

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
    const arr = clients.filter(
      (c) =>
        [c.name, c.phone, c.country].filter(Boolean).join(" ").toLowerCase().includes(term) &&
        passes(c, clientStats)
    );
    arr.sort(sortFn(clientStats));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, term, sort, filter, clientStats]);

  const fBeneficiaries = useMemo(() => {
    const arr = beneficiaries.filter(
      (b) =>
        [b.name, b.phone, b.province].filter(Boolean).join(" ").toLowerCase().includes(term) &&
        passes(b, benefStats)
    );
    arr.sort(sortFn(benefStats));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beneficiaries, term, sort, filter, benefStats]);

  return (
    <div>
      {/* Resumen */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatMini
          icon={Users}
          label="Clientes"
          value={String(clients.length)}
          active={tab === "clientes"}
          onClick={() => goTab("clientes")}
        />
        <StatMini
          icon={MapPin}
          label="Beneficiarios"
          value={String(beneficiaries.length)}
          active={tab === "beneficiarios"}
          onClick={() => goTab("beneficiarios")}
        />
        <StatMini
          icon={Wallet}
          label="Por cobrar"
          value={usd(totalOwed)}
          warn={totalOwed > 0}
          active={filter === "deuda"}
          onClick={() => {
            setTab("clientes");
            setShowForm(false);
            setFilter((f) => (f === "deuda" ? "todos" : "deuda"));
          }}
        />
      </div>

      <div className="mb-3 flex gap-2">
        <TabButton active={tab === "clientes"} onClick={() => goTab("clientes")}>
          Clientes ({clients.length})
        </TabButton>
        <TabButton
          active={tab === "beneficiarios"}
          onClick={() => goTab("beneficiarios")}
        >
          Beneficiarios ({beneficiaries.length})
        </TabButton>
      </div>

      {/* Chips de filtro */}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {chips.map((ch) => (
          <button
            key={ch.key}
            onClick={() => setFilter(ch.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95",
              filter === ch.key
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            )}
          >
            {ch.label}
          </button>
        ))}
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
        <Select
          title="Ordenar"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="w-auto bg-card px-3 py-2.5 text-xs font-medium"
        >
          <option value="nombre">A-Z</option>
          <option value="actividad">Activos</option>
        </Select>
      </div>

      <Button
        variant="primary"
        className="mb-4 w-full"
        onClick={() => setShowForm(true)}
      >
        <Plus className="h-4 w-4" />
        {tab === "clientes" ? "Añadir cliente" : "Añadir beneficiario"}
      </Button>

      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title={tab === "clientes" ? "Nuevo cliente" : "Nuevo beneficiario"}
      >
        {tab === "clientes" ? (
          <ClientForm onDone={() => setShowForm(false)} />
        ) : (
          <BeneficiaryForm clients={clients} onDone={() => setShowForm(false)} />
        )}
      </Sheet>

      {tab === "clientes" ? (
        fClients.length === 0 ? (
          <EmptyState
            title={term || filter !== "todos" ? "Sin resultados" : "Sin clientes"}
            description={
              term || filter !== "todos"
                ? "Prueba con otro filtro o búsqueda."
                : "Añade a las personas que te pagan."
            }
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
          title={term || filter !== "todos" ? "Sin resultados" : "Sin beneficiarios"}
          description={
            term || filter !== "todos"
              ? "Prueba con otro filtro o búsqueda."
              : "Añade a quienes reciben en Cuba."
          }
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

function StatMini({
  icon: Icon,
  label,
  value,
  warn = false,
  active = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  warn?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-card p-3 text-center transition active:scale-[0.98]",
        active ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
      )}
    >
      <Icon
        className={cn("mx-auto h-4 w-4", warn ? "text-warning" : "text-primary")}
      />
      <p
        className={cn(
          "tabular mt-1 truncate text-base font-bold",
          warn ? "text-warning" : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </button>
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
  );
}

function BeneficiaryForm({ clients, onDone }: { clients: Client[]; onDone: () => void }) {
  return (
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
  );
}
