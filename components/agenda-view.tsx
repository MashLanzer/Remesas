"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ChevronRight,
  Pin,
  Users,
  User,
  MapPin,
  Wallet,
  AlertTriangle,
  Repeat,
  MessageCircle,
  Check,
  Copy,
  Share2,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  EmptyState,
} from "@/components/ui";
import { Sheet } from "@/components/sheet";
import {
  createClientRecord,
  createBeneficiary,
  mergeContacts,
} from "@/app/actions";
import { usd, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DELIVERY_CURRENCIES, type Beneficiary, type Client } from "@/lib/types";
import { useDialog } from "@/components/confirm";

export type ContactStat = {
  count: number;
  total: number;
  last?: string;
  lastId?: string; // id de la última remesa (para "repetir")
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
  const [sort, setSort] = useState<"nombre" | "actividad" | "deuda">("nombre");
  type Filter =
    | "todos"
    | "deuda"
    | "activos"
    | "favoritos"
    | "inactivos"
    | "sin_remesas";
  const [filter, setFilter] = useState<Filter>("todos");
  const [showDups, setShowDups] = useState(false);
  const [showDebts, setShowDebts] = useState(false);
  const [busyMerge, startMerge] = useTransition();
  const { confirm, notify } = useDialog();

  // Control de "ya le escribí" (persistido en el dispositivo).
  const [reminded, setReminded] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem("giro_reminded");
      if (raw) setReminded(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);
  function markReminded(id: string, on: boolean) {
    setReminded((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      try {
        localStorage.setItem(
          "giro_reminded",
          JSON.stringify(Array.from(next))
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Clientes que deben, de mayor a menor deuda.
  const debtors = useMemo(
    () =>
      clients
        .filter((c) => (clientStats[c.id]?.owed ?? 0) > 0)
        .map((c) => ({ client: c, owed: clientStats[c.id]?.owed ?? 0 }))
        .sort((a, b) => b.owed - a.owed),
    [clients, clientStats]
  );

  function debtsText() {
    const total = debtors.reduce((s, d) => s + d.owed, 0);
    return (
      "Cobros pendientes:\n" +
      debtors.map((d) => `• ${d.client.name}: ${usd(d.owed)}`).join("\n") +
      `\nTotal: ${usd(total)}`
    );
  }
  async function copyDebts() {
    try {
      await navigator.clipboard.writeText(debtsText());
      notify("Lista copiada al portapapeles");
    } catch {
      notify("No se pudo copiar");
    }
  }
  async function shareDebts() {
    const text = debtsText();
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        notify("Lista copiada al portapapeles");
      }
    } catch {
      /* cancelado por el usuario */
    }
  }

  const term = q.trim().toLowerCase();

  // Posibles duplicados: contactos de la pestaña actual con el mismo teléfono.
  // El que se mantiene es el que tiene más remesas.
  const dupGroups = useMemo(() => {
    const list = (tab === "clientes" ? clients : beneficiaries) as {
      id: string;
      name: string;
      phone: string | null;
    }[];
    const stats = tab === "clientes" ? clientStats : benefStats;
    const byPhone: Record<
      string,
      { id: string; name: string; phone: string | null }[]
    > = {};
    for (const c of list) {
      const key = (c.phone ?? "").replace(/\D/g, "");
      if (key.length < 5) continue; // ignora vacíos / muy cortos
      (byPhone[key] ??= []).push(c);
    }
    return Object.values(byPhone)
      .filter((g) => g.length > 1)
      .map((g) => {
        const sorted = [...g].sort(
          (a, b) => (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0)
        );
        return { keep: sorted[0], drops: sorted.slice(1) };
      });
  }, [tab, clients, beneficiaries, clientStats, benefStats]);

  const now = Date.now();
  function matches(
    item: { id: string; pinned?: boolean },
    stats: Record<string, ContactStat>,
    f: Filter
  ) {
    const s = stats[item.id];
    switch (f) {
      case "deuda":
        return (s?.owed ?? 0) > 0;
      case "activos":
        return (s?.count ?? 0) > 0;
      case "favoritos":
        return !!item.pinned;
      case "sin_remesas":
        return !s?.count;
      case "inactivos": {
        if (!s?.last || !s.count) return false;
        const d = Math.floor(
          (now - new Date(s.last + "T00:00:00").getTime()) / 86400000
        );
        return d > 30;
      }
      default:
        return true;
    }
  }

  function goTab(next: "clientes" | "beneficiarios") {
    setTab(next);
    setShowForm(false);
    // "Con deuda" y "ordenar por deuda" solo aplican a clientes.
    if (next === "beneficiarios" && filter === "deuda") setFilter("todos");
    if (next === "beneficiarios" && sort === "deuda") setSort("nombre");
  }

  // Chips de filtro (el de deuda solo en clientes), con contador.
  const chipDefs: { key: Filter; label: string }[] = [
    { key: "todos", label: "Todos" },
    ...(tab === "clientes"
      ? ([{ key: "deuda", label: "Con deuda" }] as { key: Filter; label: string }[])
      : []),
    { key: "activos", label: "Activos" },
    { key: "favoritos", label: "Favoritos" },
    { key: "inactivos", label: "Inactivos" },
    { key: "sin_remesas", label: "Sin remesas" },
  ];
  const currentList = tab === "clientes" ? clients : beneficiaries;
  const currentStats = tab === "clientes" ? clientStats : benefStats;
  const chips = chipDefs.map((ch) => ({
    ...ch,
    count:
      ch.key === "todos"
        ? currentList.length
        : currentList.filter((i) => matches(i, currentStats, ch.key)).length,
  }));

  const totalOwed = useMemo(
    () => Object.values(clientStats).reduce((s, st) => s + (st.owed ?? 0), 0),
    [clientStats]
  );

  // Vínculos: cuántos beneficiarios tiene cada cliente y de qué cliente es cada
  // beneficiario.
  const benefCountByClient = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of beneficiaries)
      if (b.client_id) m[b.client_id] = (m[b.client_id] ?? 0) + 1;
    return m;
  }, [beneficiaries]);
  const clientNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of clients) m[c.id] = c.name;
    return m;
  }, [clients]);

  function sortFn<T extends { id: string; name: string; pinned?: boolean }>(
    stats: Record<string, ContactStat>
  ) {
    return (a: T, b: T) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap; // favoritos arriba
      if (sort === "deuda")
        return (stats[b.id]?.owed ?? 0) - (stats[a.id]?.owed ?? 0);
      if (sort === "actividad")
        return (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0);
      return a.name.localeCompare(b.name);
    };
  }

  const fClients = useMemo(() => {
    const arr = clients.filter(
      (c) =>
        [c.name, c.phone, c.country].filter(Boolean).join(" ").toLowerCase().includes(term) &&
        matches(c, clientStats, filter)
    );
    arr.sort(sortFn(clientStats));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, term, sort, filter, clientStats]);

  const fBeneficiaries = useMemo(() => {
    const arr = beneficiaries.filter(
      (b) =>
        [b.name, b.phone, b.province, b.id_card]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term) && matches(b, benefStats, filter)
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
            {ch.count > 0 ? ` (${ch.count})` : ""}
          </button>
        ))}
      </div>

      {/* Recordar cobros a todos los deudores */}
      {tab === "clientes" && debtors.length > 0 && (
        <button
          onClick={() => setShowDebts(true)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/10 py-2.5 text-sm font-semibold text-warning transition active:scale-[0.99]"
        >
          <MessageCircle className="h-4 w-4" /> Recordar cobros ({debtors.length})
        </button>
      )}

      <Sheet
        open={showDebts}
        onClose={() => setShowDebts(false)}
        title="Recordar cobros"
      >
        {debtors.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nadie te debe. 🎉
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Toca WhatsApp para enviar el recordatorio.
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={copyDebts}
                  aria-label="Copiar lista"
                  title="Copiar"
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
                <button
                  onClick={shareDebts}
                  aria-label="Compartir lista"
                  title="Compartir"
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition active:scale-95"
                >
                  <Share2 className="h-3.5 w-3.5" /> Compartir
                </button>
              </div>
            </div>
            {debtors.map(({ client, owed }) => {
              const digits = client.phone?.replace(/\D/g, "");
              const done = reminded.has(client.id);
              return (
                <Card
                  key={client.id}
                  className={cn(
                    "flex items-center justify-between gap-3 p-3",
                    done && "opacity-60"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {client.name}
                    </p>
                    {done ? (
                      <button
                        onClick={() => markReminded(client.id, false)}
                        className="flex items-center gap-1 text-xs font-semibold text-income"
                      >
                        <Check className="h-3.5 w-3.5" /> Recordado · deshacer
                      </button>
                    ) : (
                      <p className="text-xs font-semibold text-warning">
                        Debe {usd(owed)}
                      </p>
                    )}
                  </div>
                  {digits ? (
                    <a
                      href={`https://wa.me/${digits}?text=${encodeURIComponent(
                        `Hola ${client.name}, te recuerdo que tienes un saldo pendiente de ${usd(
                          owed
                        )} por tus remesas. ¡Gracias!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markReminded(client.id, true)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-warning px-3 py-2 text-xs font-semibold text-white transition active:scale-95"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  ) : (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      Sin teléfono
                    </span>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Sheet>

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
          {tab === "clientes" && <option value="deuda">Deuda</option>}
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

      {/* Aviso de posibles duplicados */}
      {dupGroups.length > 0 && (
        <button
          onClick={() => setShowDups(true)}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-left transition active:scale-[0.99]"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warning">
              {dupGroups.length} posible{dupGroups.length > 1 ? "s" : ""} duplicado
              {dupGroups.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-warning/80">
              Mismo teléfono. Toca para revisar y fusionar.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-warning" />
        </button>
      )}

      <Sheet
        open={showDups}
        onClose={() => setShowDups(false)}
        title="Posibles duplicados"
      >
        {dupGroups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No quedan duplicados. 🎉
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Se mantiene el contacto con más remesas; los demás se unen a él sin
              perder historial.
            </p>
            {dupGroups.map((g) => {
              const stats = tab === "clientes" ? clientStats : benefStats;
              const keepCount = stats[g.keep.id]?.count ?? 0;
              return (
                <Card key={g.keep.id} className="space-y-2">
                  <p className="text-sm text-foreground">
                    Se mantiene: <span className="font-bold">{g.keep.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {keepCount} remesa{keepCount !== 1 ? "s" : ""}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Se unen: {g.drops.map((d) => d.name).join(", ")}
                  </p>
                  {g.keep.phone && (
                    <p className="text-[11px] text-muted-foreground">
                      📞 {g.keep.phone}
                    </p>
                  )}
                  <button
                    disabled={busyMerge}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: "Fusionar contactos",
                          message: `Se unirán ${g.drops.length} contacto${
                            g.drops.length > 1 ? "s" : ""
                          } en "${g.keep.name}". Sus remesas se conservan. No se puede deshacer.`,
                          confirmLabel: "Fusionar",
                        })
                      ) {
                        startMerge(() =>
                          mergeContacts(
                            tab === "clientes" ? "cliente" : "beneficiario",
                            g.keep.id,
                            g.drops.map((d) => d.id)
                          )
                        );
                      }
                    }}
                    className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
                  >
                    Fusionar en {g.keep.name}
                  </button>
                </Card>
              );
            })}
          </div>
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
          <ContactGroups
            items={fClients}
            showFavs={filter !== "favoritos"}
            renderCard={(c) => (
              <ContactCard
                key={c.id}
                href={`/agenda/cliente/${c.id}`}
                name={c.name}
                sub={[c.phone, c.country].filter(Boolean).join(" · ")}
                pinned={c.pinned}
                stat={clientStats[c.id]}
                repeatHref={
                  clientStats[c.id]?.lastId
                    ? `/remesas/nueva?dup=${clientStats[c.id]?.lastId}`
                    : undefined
                }
                link={
                  benefCountByClient[c.id]
                    ? {
                        icon: Users,
                        text: `${benefCountByClient[c.id]} beneficiario${
                          benefCountByClient[c.id] > 1 ? "s" : ""
                        }`,
                      }
                    : undefined
                }
              />
            )}
          />
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
        <ContactGroups
          items={fBeneficiaries}
          showFavs={filter !== "favoritos"}
          renderCard={(b) => (
            <ContactCard
              key={b.id}
              href={`/agenda/beneficiario/${b.id}`}
              name={b.name}
              sub={[b.phone, b.province].filter(Boolean).join(" · ")}
              pinned={b.pinned}
              stat={benefStats[b.id]}
              repeatHref={
                benefStats[b.id]?.lastId
                  ? `/remesas/nueva?dup=${benefStats[b.id]?.lastId}`
                  : undefined
              }
              link={
                b.client_id && clientNameById[b.client_id]
                  ? { icon: User, text: `de ${clientNameById[b.client_id]}` }
                  : undefined
              }
            />
          )}
        />
      )}
    </div>
  );
}

function ContactGroups<T extends { id: string; pinned?: boolean }>({
  items,
  showFavs,
  renderCard,
}: {
  items: T[];
  showFavs: boolean;
  renderCard: (item: T) => React.ReactNode;
}) {
  const favs = showFavs ? items.filter((i) => i.pinned) : [];
  if (favs.length === 0) {
    return <div className="space-y-2">{items.map(renderCard)}</div>;
  }
  const rest = items.filter((i) => !i.pinned);
  return (
    <div className="space-y-4">
      <div>
        <GroupHeader>
          <Pin className="h-3 w-3 fill-primary text-primary" /> Favoritos
        </GroupHeader>
        <div className="space-y-2">{favs.map(renderCard)}</div>
      </div>
      {rest.length > 0 && (
        <div>
          <GroupHeader>Todos</GroupHeader>
          <div className="space-y-2">{rest.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
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
  link,
  repeatHref,
}: {
  href: string;
  name: string;
  sub: string;
  pinned?: boolean;
  stat?: ContactStat;
  link?: { icon: LucideIcon; text: string };
  repeatHref?: string;
}) {
  const initial = name.charAt(0).toUpperCase();
  const LinkIcon = link?.icon;
  return (
    <Card className="flex items-center gap-2 p-3.5">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
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
          {stat?.owed && stat.owed > 0 ? (
            <p className="text-[11px] font-semibold text-warning">
              Debe {usd(stat.owed)}
            </p>
          ) : (
            LinkIcon &&
            link && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-primary/80">
                <LinkIcon className="h-3 w-3 shrink-0" /> {link.text}
              </p>
            )
          )}
        </div>
      </Link>
      {repeatHref ? (
        <Link
          href={repeatHref}
          aria-label="Repetir remesa"
          title="Repetir última remesa"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-primary transition active:scale-90"
        >
          <Repeat className="h-4 w-4" />
        </Link>
      ) : (
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
    </Card>
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
