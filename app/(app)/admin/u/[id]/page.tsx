import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Send,
  DollarSign,
} from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/ui";
import { isSuperAdmin, getAdminUserDetail } from "@/lib/admin";
import { usd, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusTone(s: string) {
  if (s === "entregado") return "emerald" as const;
  if (s === "liquidado") return "blue" as const;
  return "amber" as const;
}
function roleTone(role: string | null) {
  if (role === "operador") return "blue" as const;
  if (role === "repartidor") return "emerald" as const;
  if (role === "cliente") return "amber" as const;
  return "slate" as const;
}

export default async function AdminUserPage({
  params,
}: {
  params: { id: string };
}) {
  if (!(await isSuperAdmin())) redirect("/");

  const detail = await getAdminUserDetail(params.id);
  if (!detail || !detail.user) notFound();
  const u = detail.user;

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al panel
      </Link>

      <PageHeader title={u.full_name || "Usuario"} />

      {/* Ficha */}
      <Card className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={roleTone(u.role)}>{u.role || "sin rol"}</Badge>
          {u.role === "repartidor" && u.member_status && (
            <Badge tone={u.member_status === "active" ? "emerald" : "amber"}>
              {u.member_status === "active" ? "activo" : u.member_status}
            </Badge>
          )}
        </div>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {u.email && (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" /> {u.email}
            </p>
          )}
          {u.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" /> {u.phone}
            </p>
          )}
          {u.business_name && (
            <p className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" /> {u.business_name}
            </p>
          )}
          <p className="text-xs">Registrado el {formatDate(u.created_at)}</p>
        </div>
      </Card>

      {/* Resumen de remesas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-info/10 text-info">
            <Send className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">
              {detail.remesas_count}
            </p>
            <p className="text-[11px] text-muted-foreground">remesas</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-income/10 text-income">
            <DollarSign className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">
              {usd(detail.remesas_volume)}
            </p>
            <p className="text-[11px] text-muted-foreground">volumen</p>
          </div>
        </Card>
      </div>

      {/* Remesas */}
      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Remesas ({detail.remesas.length})
        </h2>
        {detail.remesas.length === 0 ? (
          <p className="px-1 py-4 text-center text-sm text-muted-foreground">
            Este usuario no ha creado remesas.
          </p>
        ) : (
          <div className="space-y-2">
            {detail.remesas.map((r) => (
              <Card
                key={r.id}
                className="flex items-center justify-between gap-2 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {usd(r.amount_usd)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.date)}
                  </p>
                </div>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
