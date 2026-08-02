import {
  LogOut,
  Wallet,
  CalendarDays,
  Send,
  BarChart3,
  Clock,
  User,
  MapPin,
  Truck,
  Star,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getRemittances,
  getBusinessSettings,
  getSessionContext,
  getMyDelivererRating,
} from "@/lib/data";
import Link from "next/link";
import { updateProfile } from "@/app/actions";
import { Card, Field, Input, Button, PageHeader } from "@/components/ui";
import { ShareCard } from "@/components/share-card";
import { PaymentMethods } from "@/components/payment-methods";
import { SmartImage } from "@/components/smart-image";
import { CoverageSelector } from "@/components/coverage-selector";
import { ExportMyDeliveries } from "@/components/export-my-deliveries";
import { PerfilSheetsMenu } from "@/components/perfil-sheets-menu";
import { usd, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Enlace privado del dueño: la landing pública de la app. Solo se muestra a
// esta cuenta para tenerlo siempre a mano.
const OWNER_EMAIL = "brayanibarra0105@gmail.com";
const LANDING_URL = "https://landing-3d-tau.vercel.app";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, remittances, settings, ctx] = await Promise.all([
    user
      ? supabase.from("profiles").select("*").eq("id", user.id).single()
      : Promise.resolve({ data: null as Record<string, unknown> | null }),
    getRemittances(),
    getBusinessSettings(),
    getSessionContext(),
  ]);
  const isOperador = ctx.isOperador;
  const rating = isOperador ? null : await getMyDelivererRating();
  const share = (r: { my_share: number; partner_share: number }) =>
    Number(isOperador ? r.my_share : r.partner_share);

  const p = (profile ?? {}) as Record<string, string | number | null>;
  const displayName = (p.full_name as string) || user?.email || "?";
  const initial = displayName.charAt(0).toUpperCase();
  const avatarUrl = (p.avatar_url as string) || null;
  const businessName = settings.business_name || null;
  // Color propio del avatar, derivado del nombre (mismo criterio que el cliente).
  const seed = displayName
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;

  const myProfit = remittances.reduce((s, r) => s + share(r), 0);
  const count = remittances.length;
  const since = (p.created_at as string) || null;

  // Este mes y ticket promedio.
  const now = new Date();
  const monthProfit = remittances
    .filter((r) => {
      const d = new Date(r.date + "T00:00:00");
      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      );
    })
    .reduce((s, r) => s + share(r), 0);
  const avgTicket = count
    ? remittances.reduce((s, r) => s + Number(r.amount_usd), 0) / count
    : 0;

  // Comprobantes de entrega que ha subido el repartidor (galería).
  const proofs = remittances.filter((r) => r.delivery_proof_url);

  // Estadísticas personales del repartidor.
  const delivered = remittances.filter((r) => r.status !== "pendiente");
  // Provincia más frecuente.
  const provinceCounts: Record<string, number> = {};
  for (const r of delivered) {
    const pv = r.beneficiary?.province;
    if (pv) provinceCounts[pv] = (provinceCounts[pv] ?? 0) + 1;
  }
  const topProvince =
    Object.entries(provinceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  // Entregas por semana (promedio) desde la primera remesa.
  const dates = remittances.map((r) => r.date).filter(Boolean).sort();
  const firstDate = dates[0] ? new Date(dates[0] + "T00:00:00") : null;
  const weeksActive = firstDate
    ? Math.max(1, (Date.now() - firstDate.getTime()) / (7 * 86400000))
    : 1;
  const perWeek = delivered.length / weeksActive;
  // Entregas de los últimos 7 días.
  const weekAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  })();
  const thisWeek = delivered.filter((r) => r.date >= weekAgoStr).length;

  // Zona de cobertura (provincias) del repartidor.
  const coverage = ((p.coverage_provinces as string) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" icon={User} />

      {/* Cabecera centrada (igual para operador y repartidor) */}
      <div className="flex flex-col items-center pt-1 text-center">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Foto de perfil"
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            style={{
              background: `hsl(${hue} 60% 50% / 0.16)`,
              color: `hsl(${hue} 55% 45%)`,
            }}
            className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-extrabold"
          >
            {initial}
          </span>
        )}
        <h2 className="mt-3 text-xl font-bold text-foreground">
          {(p.full_name as string) || "Sin nombre"}
        </h2>
        {user?.email && (
          <p className="text-sm text-muted-foreground">{user.email}</p>
        )}
        <span className="mt-1.5 rounded-full bg-muted px-3 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {isOperador ? "Operador" : "Repartidor"}
        </span>
      </div>

      {/* Enlace a la landing pública — solo visible para el dueño */}
      {user?.email === OWNER_EMAIL && (
        <a
          href={LANDING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3.5 transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              Web pública de la app
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {LANDING_URL.replace("https://", "")}
            </span>
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            Solo tú ves esto
          </span>
        </a>
      )}

      {/* Mini-estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={Wallet} tone="income" label="Has ganado" value={usd(myProfit)} />
        <StatTile icon={CalendarDays} tone="primary" label="Este mes" value={usd(monthProfit)} />
        <StatTile icon={Send} tone="info" label="Remesas" value={String(count)} />
        <StatTile icon={BarChart3} tone="primary" label="Promedio" value={usd(avgTicket)} />
        <StatTile icon={Clock} tone="info" label="Desde" value={since ? formatDate(since) : "—"} />
      </div>

      {/* Estadísticas personales (repartidor) */}
      {!isOperador && delivered.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Tus estadísticas</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              icon={MapPin}
              tone="info"
              label="Zona frecuente"
              value={topProvince}
            />
            <StatTile
              icon={CalendarDays}
              tone="primary"
              label="Por semana"
              value={perWeek.toFixed(1)}
            />
            <StatTile
              icon={Truck}
              tone="income"
              label="Últimos 7 días"
              value={String(thisWeek)}
            />
            {rating && rating.total > 0 && (
              <StatTile
                icon={Star}
                tone="primary"
                label={`${rating.total} reseña${rating.total === 1 ? "" : "s"}`}
                value={`${rating.avg.toFixed(1)}★`}
              />
            )}
          </div>
        </section>
      )}

      {/* Galería de comprobantes de entrega (repartidor) */}
      {!isOperador && proofs.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Comprobantes de entrega ({proofs.length})</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {proofs.slice(0, 12).map((r) => (
              <Link
                key={r.id}
                href={`/remesas/${r.id}`}
                className="relative aspect-square overflow-hidden rounded-xl border border-border transition active:scale-95"
              >
                <SmartImage
                  src={r.delivery_proof_url as string}
                  alt="Comprobante de entrega"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 text-[10px] font-semibold text-white">
                  {r.beneficiary?.name || usd(r.amount_usd)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Menú del perfil: cada bloque se abre en una hoja */}
      <PerfilSheetsMenu
        datos={
          <form action={updateProfile} className="space-y-3">
            <Field label="Nombre">
              <Input
                name="full_name"
                defaultValue={(p.full_name as string) ?? ""}
                placeholder="Tu nombre"
              />
            </Field>
            <Field
              label="Foto de perfil (opcional)"
              hint={avatarUrl ? "Sube otra para reemplazarla." : "Se ve en tu perfil."}
            >
              <input
                type="file"
                name="avatar"
                accept="image/*"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono / WhatsApp">
                <Input
                  name="phone"
                  inputMode="tel"
                  defaultValue={(p.phone as string) ?? ""}
                  placeholder="+1 305 000 0000"
                />
              </Field>
              <Field label="Mi % ganancia" hint="Editable en cada envío.">
                <Input
                  type="number"
                  name="default_split_percent"
                  min="0"
                  max="100"
                  defaultValue={String((p.default_split_percent as number) ?? 50)}
                />
              </Field>
            </div>
            <p className="pt-1 text-xs font-medium text-muted-foreground">
              Métodos de cobro (para copiar rápido al cliente)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Zelle">
                <Input
                  name="zelle"
                  defaultValue={(p.zelle as string) ?? ""}
                  placeholder="Correo o teléfono"
                />
              </Field>
              <Field label="CashApp">
                <Input
                  name="cashapp"
                  defaultValue={(p.cashapp as string) ?? ""}
                  placeholder="$tu-cashtag"
                />
              </Field>
            </div>
            <Field label="PayPal">
              <Input
                name="paypal"
                defaultValue={(p.paypal as string) ?? ""}
                placeholder="Correo de PayPal"
              />
            </Field>
            <Button type="submit" className="w-full">
              Guardar
            </Button>
          </form>
        }
        cobro={
          <div className="space-y-3">
            <ShareCard
              variant="button"
              name={(p.full_name as string) ?? null}
              businessName={businessName}
              phone={(p.phone as string) ?? null}
              zelle={(p.zelle as string) ?? null}
              cashapp={(p.cashapp as string) ?? null}
              paypal={(p.paypal as string) ?? null}
            />
            <PaymentMethods
              name={(p.full_name as string) ?? null}
              brand={businessName}
              phone={(p.phone as string) ?? null}
              zelle={(p.zelle as string) ?? null}
              cashapp={(p.cashapp as string) ?? null}
              paypal={(p.paypal as string) ?? null}
            />
          </div>
        }
        cobertura={
          !isOperador ? <CoverageSelector initial={coverage} /> : undefined
        }
        entregas={
          !isOperador && remittances.length > 0 ? (
            <ExportMyDeliveries remittances={remittances} />
          ) : undefined
        }
      />

      {/* Cerrar sesión */}
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive transition active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </form>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon;
  tone: "income" | "primary" | "info";
  label: string;
  value: string;
}) {
  const toneCls =
    tone === "income"
      ? "bg-income/10 text-income"
      : tone === "info"
      ? "bg-info/10 text-info"
      : "bg-primary/10 text-primary";
  return (
    <Card className="flex flex-col items-center gap-1 p-3 text-center">
      <span
        className={
          "flex h-9 w-9 items-center justify-center rounded-full " + toneCls
        }
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="tabular truncate text-sm font-bold text-foreground">
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </Card>
  );
}
