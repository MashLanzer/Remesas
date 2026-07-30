"use client";

import { useMemo, useState } from "react";
import { Search, Users, UserRound, Building2 } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { adminSetRole, adminSetMemberStatus } from "@/app/actions";
import type { AdminUser, AdminClient } from "@/lib/admin";

function roleTone(role: string | null) {
  if (role === "operador") return "blue" as const;
  if (role === "repartidor") return "emerald" as const;
  if (role === "cliente") return "amber" as const;
  return "slate" as const;
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function AdminBrowser({
  users,
  clients,
}: {
  users: AdminUser[];
  clients: AdminClient[];
}) {
  const [tab, setTab] = useState<"users" | "clients">("users");
  const [q, setQ] = useState("");

  const filteredUsers = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(t) ||
        (u.full_name ?? "").toLowerCase().includes(t) ||
        (u.business_name ?? "").toLowerCase().includes(t)
    );
  }, [users, q]);

  const filteredClients = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter(
      (c) =>
        (c.email ?? "").toLowerCase().includes(t) ||
        (c.full_name ?? "").toLowerCase().includes(t) ||
        (c.business_name ?? "").toLowerCase().includes(t)
    );
  }, [clients, q]);

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-2">
        <TabBtn active={tab === "users"} onClick={() => setTab("users")}>
          <Users className="h-4 w-4" /> Usuarios ({users.length})
        </TabBtn>
        <TabBtn active={tab === "clients"} onClick={() => setTab("clients")}>
          <UserRound className="h-4 w-4" /> Clientes ({clients.length})
        </TabBtn>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, correo o negocio…"
          className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {tab === "users" ? (
        <div className="space-y-2">
          {filteredUsers.length === 0 && (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              Sin resultados.
            </p>
          )}
          {filteredUsers.map((u) => (
            <UserRow key={u.id} u={u} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClients.length === 0 && (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              Sin resultados.
            </p>
          )}
          {filteredClients.map((c) => (
            <ClientRow key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabBtn({
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
      className={
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition " +
        (active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-card text-muted-foreground")
      }
    >
      {children}
    </button>
  );
}

function UserRow({ u }: { u: AdminUser }) {
  return (
    <Card className="space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {u.full_name || "Sin nombre"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={roleTone(u.role)}>{u.role || "sin rol"}</Badge>
          {u.role === "repartidor" && u.member_status && (
            <Badge tone={u.member_status === "active" ? "emerald" : "amber"}>
              {u.member_status === "active" ? "activo" : u.member_status}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {u.business_name && (
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> {u.business_name}
          </span>
        )}
        <span>Desde {fmtDate(u.created_at)}</span>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
        <form action={adminSetRole} className="flex items-center gap-1.5">
          <input type="hidden" name="user_id" value={u.id} />
          <select
            name="role"
            defaultValue={u.role ?? ""}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none"
          >
            <option value="">sin rol</option>
            <option value="cliente">cliente</option>
            <option value="repartidor">repartidor</option>
            <option value="operador">operador</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground transition active:scale-95"
          >
            Cambiar rol
          </button>
        </form>

        {u.role === "repartidor" &&
          (u.member_status === "active" ? (
            <form action={adminSetMemberStatus}>
              <input type="hidden" name="user_id" value={u.id} />
              <input type="hidden" name="status" value="pending" />
              <button
                type="submit"
                className="rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-warning transition active:scale-95"
              >
                Suspender
              </button>
            </form>
          ) : (
            <form action={adminSetMemberStatus}>
              <input type="hidden" name="user_id" value={u.id} />
              <input type="hidden" name="status" value="active" />
              <button
                type="submit"
                className="rounded-lg bg-income/10 px-2.5 py-1.5 text-xs font-medium text-income transition active:scale-95"
              >
                Aprobar
              </button>
            </form>
          ))}
      </div>
    </Card>
  );
}

function ClientRow({ c }: { c: AdminClient }) {
  return (
    <Card className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {c.full_name || "Sin nombre"}
        </p>
        <p className="truncate text-xs text-muted-foreground">{c.email}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {c.business_name && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> {c.business_name}
            </span>
          )}
          <span>Desde {fmtDate(c.created_at)}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-base font-bold tabular-nums text-foreground">
          {c.remesas}
        </p>
        <p className="text-[10px] text-muted-foreground">remesas</p>
      </div>
    </Card>
  );
}
