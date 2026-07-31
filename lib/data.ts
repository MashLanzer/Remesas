import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { calcPartnerBalance } from "@/lib/calc";
import {
  DEFAULT_SETTINGS,
  type Beneficiary,
  type BusinessSettings,
  type Client,
  type ExchangeRate,
  type Offer,
  type Order,
  type Profile,
  type RateHistory,
  type Remittance,
  type RemittancePackage,
  type Settlement,
  type UserRole,
} from "@/lib/types";

export interface SessionContext {
  userId: string | null;
  role: UserRole | null;
  isOperador: boolean;
  isCliente: boolean; // usuario final (lado cliente)
  tenantId: string | null; // negocio (operador) al que pertenece; null = legacy sin migrar
  memberStatus: string | null; // 'active' | 'pending' | null
  needsOnboarding: boolean; // multi-negocio activo y aún sin rol elegido
}

// Contexto del usuario actual. Tolerante: si las columnas multi-negocio no
// existen todavía (sin migrar), cae al comportamiento de un solo negocio.
// Memoizado por petición (React cache): aunque se llame decenas de veces en una
// carga, solo valida la sesión y consulta el perfil una vez.
export const getSessionContext = cache(
  async (): Promise<SessionContext> => {
    const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      userId: null,
      role: "operador",
      isOperador: true,
      isCliente: false,
      tenantId: null,
      memberStatus: null,
      needsOnboarding: false,
    };

  type ProfileRow = {
    role?: string | null;
    operator_id?: string | null;
    member_status?: string | null;
  };
  let row: ProfileRow | null = null;
  let multiTenant = true;

  const full = await supabase
    .from("profiles")
    .select("role, operator_id, member_status")
    .eq("id", user.id)
    .single();
  if (full.data) {
    row = full.data as ProfileRow;
  } else if (full.error?.code === "42703") {
    // 42703 = columna inexistente → base sin migrar (legacy de un solo negocio).
    multiTenant = false;
    const basic = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    row = (basic.data as ProfileRow) ?? null;
  } else {
    // Migrada pero sin fila de perfil (trigger falló, usuario manual): que pase
    // por el onboarding en vez de entrar como operador a medias.
    row = null;
  }

  const role = (row?.role as UserRole | null) ?? null;
  const memberStatus = (row?.member_status as string) ?? null;
  // Sin migrar (legacy): null/operador se tratan como operador para no romper.
  // Con multi-negocio: operador estricto; null => onboarding pendiente.
  const isOperador = multiTenant
    ? role === "operador"
    : role !== "repartidor" && role !== "cliente";
  const isCliente = role === "cliente";
  const needsOnboarding = multiTenant && role == null;
  // tenantId solo si pertenece a un negocio activo, igual que la función
  // current_operator_id() de RLS (operador, repartidor 'active', o cliente).
  const isActiveMember =
    role === "operador" ||
    role === "cliente" ||
    (role === "repartidor" && memberStatus === "active");
  const tenantId = multiTenant
    ? isActiveMember
      ? (row?.operator_id ?? (role === "operador" ? user.id : null))
      : null
    : null;

    return {
      userId: user.id,
      role,
      isOperador,
      isCliente,
      tenantId,
      memberStatus,
      needsOnboarding,
    };
  }
);

export async function getRepartidores(): Promise<Profile[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  let q = supabase
    .from("profiles")
    .select("id, full_name, role, phone, member_status, coverage_provinces")
    .eq("role", "repartidor")
    .order("full_name", { ascending: true });
  if (ctx.tenantId) q = q.eq("operator_id", ctx.tenantId);
  const { data } = await q;
  // Solo repartidores aprobados (o legacy sin estado) son asignables.
  return ((data as Profile[]) ?? []).filter(
    (p) => p.member_status == null || p.member_status === "active"
  );
}

export interface Team {
  code: string | null;
  pending: Profile[];
  members: Profile[];
}

export async function getTeam(): Promise<Team> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId)
    return { code: null, pending: [], members: [] };

  const { data: me } = await supabase
    .from("profiles")
    .select("operator_code")
    .eq("id", ctx.userId)
    .maybeSingle();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, member_status")
    .eq("operator_id", ctx.tenantId)
    .eq("role", "repartidor")
    .order("full_name", { ascending: true });
  const list = (data as Profile[]) ?? [];

  return {
    code: (me as { operator_code?: string } | null)?.operator_code ?? null,
    pending: list.filter((p) => p.member_status === "pending"),
    members: list.filter((p) => p.member_status !== "pending"),
  };
}

export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  let q = supabase
    .from("profiles")
    .select("id, full_name, role, phone")
    .order("full_name", { ascending: true });
  if (ctx.tenantId) q = q.eq("operator_id", ctx.tenantId);
  const { data } = await q;
  return (data as Profile[]) ?? [];
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (ctx.tenantId) {
    const { data } = await supabase
      .from("business_settings")
      .select("*")
      .eq("operator_id", ctx.tenantId)
      .maybeSingle();
    return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as BusinessSettings;
  }
  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as BusinessSettings;
}

// Funciones de lectura para Server Components.

export async function getRemittances(limit?: number): Promise<Remittance[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  let query = supabase
    .from("remittances")
    .select("*, client:clients(*), beneficiary:beneficiaries(*)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (ctx.tenantId) query = query.eq("operator_id", ctx.tenantId);
  // El repartidor solo ve las remesas que le fueron asignadas.
  if (!ctx.isOperador && ctx.userId) query = query.eq("deliverer_id", ctx.userId);
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data as Remittance[]) ?? [];
}

export async function getRemittance(id: string): Promise<Remittance | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  const { data } = await supabase
    .from("remittances")
    .select("*, client:clients(*), beneficiary:beneficiaries(*)")
    .eq("id", id)
    .single();
  const r = (data as Remittance) ?? null;
  if (!r) return null;
  // Aislamiento: no ver remesas de otro negocio ni de otro repartidor.
  if (ctx.tenantId && r.operator_id && r.operator_id !== ctx.tenantId) return null;
  if (!ctx.isOperador && ctx.userId && r.deliverer_id !== ctx.userId) return null;
  return r;
}

// Código de entrega (OTP) de una remesa. La RLS de delivery_codes solo deja
// leerlo al operador y al remitente (created_by) — NUNCA al repartidor, así que
// para él devuelve null. Tolerante si la migración 0049 no está corrida.
export type DeliveryCodeInfo = {
  code: string;
  verified_at: string | null;
  no_code_reason: string | null;
};

export async function getDeliveryCode(
  remittanceId: string
): Promise<DeliveryCodeInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_codes")
    .select("code, verified_at, no_code_reason")
    .eq("remittance_id", remittanceId)
    .maybeSingle();
  if (error) return null;
  return (data as DeliveryCodeInfo) ?? null;
}

// Clientes y beneficiarios son del negocio, pero un repartidor solo ve los que
// tiene EN COMÚN con su operador: los que aparecen en sus propias remesas
// (deliverer_id). Nunca ve los clientes/beneficiarios que trabajó otro
// repartidor. El operador ve todos los del negocio.
type AgendaScope = { clientIds: Set<string>; beneficiaryIds: Set<string> };

async function getRepartidorAgendaScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: SessionContext
): Promise<AgendaScope | null> {
  // Operador (o contexto sin usuario) ve toda la agenda del negocio.
  if (ctx.isOperador || !ctx.userId) return null;
  let q = supabase
    .from("remittances")
    .select("client_id, beneficiary_id")
    .eq("deliverer_id", ctx.userId);
  if (ctx.tenantId) q = q.eq("operator_id", ctx.tenantId);
  const { data } = await q;
  const clientIds = new Set<string>();
  const beneficiaryIds = new Set<string>();
  for (const row of (data as
    | { client_id: string | null; beneficiary_id: string | null }[]
    | null) ?? []) {
    if (row.client_id) clientIds.add(row.client_id);
    if (row.beneficiary_id) beneficiaryIds.add(row.beneficiary_id);
  }
  return { clientIds, beneficiaryIds };
}

// ¿Es visible para el repartidor una entrada de agenda? Lo es si: la creó el
// negocio (created_by nulo/legacy o = operador), la creó él mismo, o aparece en
// sus remesas. Solo se ocultan las que creó OTRO repartidor.
function visibleToRep(
  createdBy: string | null | undefined,
  inMine: boolean,
  ctx: SessionContext
): boolean {
  return (
    createdBy == null ||
    createdBy === ctx.tenantId ||
    createdBy === ctx.userId ||
    inMine
  );
}

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  let q = supabase.from("clients").select("*").order("name", { ascending: true });
  if (ctx.tenantId) q = q.eq("operator_id", ctx.tenantId);
  const { data } = await q;
  let list = (data as Client[]) ?? [];
  const scope = await getRepartidorAgendaScope(supabase, ctx);
  if (scope)
    list = list.filter((c) =>
      visibleToRep(c.created_by, scope.clientIds.has(c.id), ctx)
    );
  return list;
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  const c = (data as Client) ?? null;
  if (!c) return null;
  // El repartidor no puede abrir un cliente que creó otro repartidor.
  const scope = await getRepartidorAgendaScope(supabase, ctx);
  if (scope && !visibleToRep(c.created_by, scope.clientIds.has(c.id), ctx))
    return null;
  return c;
}

export async function getBeneficiary(id: string): Promise<Beneficiary | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  const { data } = await supabase
    .from("beneficiaries")
    .select("*")
    .eq("id", id)
    .single();
  const b = (data as Beneficiary) ?? null;
  if (!b) return null;
  const scope = await getRepartidorAgendaScope(supabase, ctx);
  if (scope && !visibleToRep(b.created_by, scope.beneficiaryIds.has(b.id), ctx))
    return null;
  return b;
}

export async function getBeneficiaries(): Promise<Beneficiary[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  let q = supabase
    .from("beneficiaries")
    .select("*")
    .order("name", { ascending: true });
  if (ctx.tenantId) q = q.eq("operator_id", ctx.tenantId);
  const { data } = await q;
  let list = (data as Beneficiary[]) ?? [];
  const scope = await getRepartidorAgendaScope(supabase, ctx);
  if (scope)
    list = list.filter((b) =>
      visibleToRep(b.created_by, scope.beneficiaryIds.has(b.id), ctx)
    );
  return list;
}

export async function getExchangeRates(): Promise<ExchangeRate[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  // Un cliente sin negocio no debe disparar una consulta sin filtrar por tenant.
  if (ctx.isCliente && !ctx.tenantId) return [];
  let q = supabase
    .from("exchange_rates")
    .select("*")
    .order("currency", { ascending: true });
  if (ctx.tenantId) q = q.eq("operator_id", ctx.tenantId);
  const { data } = await q;
  return (data as ExchangeRate[]) ?? [];
}

export async function getRateHistory(): Promise<RateHistory[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  let q = supabase
    .from("rate_history")
    .select("*")
    .order("changed_at", { ascending: true });
  if (ctx.tenantId) q = q.eq("operator_id", ctx.tenantId);
  const { data } = await q;
  return (data as RateHistory[]) ?? [];
}

export async function getAlertCount(): Promise<number> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  const mine = !ctx.isOperador && ctx.userId ? ctx.userId : null;

  let pendingQ = supabase
    .from("remittances")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendiente");
  if (ctx.tenantId) pendingQ = pendingQ.eq("operator_id", ctx.tenantId);
  if (mine) pendingQ = pendingQ.eq("deliverer_id", mine);
  const { count: pending } = await pendingQ;

  // "Por cobrar" es asunto del operador (él recibe el dinero). Para el
  // repartidor todas sus remesas están sin cobrar por diseño → sería puro ruido.
  let porCobrar = 0;
  if (ctx.isOperador) {
    let cobrarQ = supabase
      .from("remittances")
      .select("id", { count: "exact", head: true })
      .eq("client_paid", false);
    if (ctx.tenantId) cobrarQ = cobrarQ.eq("operator_id", ctx.tenantId);
    porCobrar = (await cobrarQ).count ?? 0;
  }

  let saldoAlert = 0;
  const settings = await getBusinessSettings();
  const threshold = settings.settle_threshold ? Number(settings.settle_threshold) : 0;
  if (threshold > 0) {
    const [rem, set] = await Promise.all([getRemittances(), getSettlements()]);
    if (calcPartnerBalance(rem, set) >= threshold) saldoAlert = 1;
  }

  // Tasas sin actualizar hace 3+ días (cuenta como 1 aviso).
  let ratesAlert = 0;
  const rates = await getExchangeRates();
  const stale = rates.some(
    (r) =>
      r.active !== false &&
      Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000) >= 3
  );
  if (stale) ratesAlert = 1;

  // Solicitudes de repartidores pendientes (solo operador).
  let teamAlert = 0;
  if (ctx.isOperador && ctx.tenantId) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", ctx.tenantId)
      .eq("role", "repartidor")
      .eq("member_status", "pending");
    teamAlert = count ?? 0;
  }

  // Pedidos nuevos de clientes por atender (personal): remesas + tienda.
  let ordersAlert = 0;
  if (ctx.tenantId) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", ctx.tenantId)
      .eq("status", "pendiente");
    const { count: sc } = await supabase
      .from("store_orders")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", ctx.tenantId)
      .eq("status", "pendiente");
    ordersAlert = (count ?? 0) + (sc ?? 0);
  }

  // Preferencias de avisos: el usuario puede silenciar categorías (cookie).
  let muted: Set<string>;
  try {
    const v = cookies().get("giro_alert_mute")?.value || "";
    muted = new Set(v.split(",").filter(Boolean));
  } catch {
    muted = new Set();
  }
  let total = 0;
  if (!muted.has("pendientes")) total += pending ?? 0;
  if (!muted.has("porCobrar")) total += porCobrar;
  if (!muted.has("saldo")) total += saldoAlert;
  if (!muted.has("tasas")) total += ratesAlert;
  if (!muted.has("equipo")) total += teamAlert;
  if (!muted.has("pedidos")) total += ordersAlert;
  return total;
}

export interface DeliveryExpense {
  id: string;
  operator_id: string | null;
  deliverer_id: string | null;
  date: string;
  amount: number;
  note: string | null;
  created_at: string;
}

// Gastos de reparto del repartidor actual (tolerante si la tabla no existe).
export async function getMyDeliveryExpenses(): Promise<DeliveryExpense[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (ctx.isOperador || !ctx.userId) return [];
  const { data, error } = await supabase
    .from("delivery_expenses")
    .select("*")
    .eq("deliverer_id", ctx.userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as DeliveryExpense[]) ?? [];
}

// Referidos del cliente actual: su código (lo genera si falta), cuántos invitó,
// cuántos ya se premiaron y el bono en puntos. Tolerante si falta la 0043.
export async function getMyReferral(): Promise<{
  code: string | null;
  invited: number;
  rewarded: number;
  bonus: number;
} | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isCliente || !ctx.userId) return null;
  const [{ data: code, error: e1 }, { data: stats }] = await Promise.all([
    supabase.rpc("ensure_referral_code"),
    supabase.rpc("my_referral_stats"),
  ]);
  if (e1) return null; // migración no aplicada aún
  const row = (Array.isArray(stats) ? stats[0] : stats) as
    | { invited?: number; rewarded?: number; bonus?: number }
    | null;
  return {
    code: (code as string | null) ?? null,
    invited: Number(row?.invited ?? 0),
    rewarded: Number(row?.rewarded ?? 0),
    bonus: Number(row?.bonus ?? 50),
  };
}

// === Anuncios del operador ===
import type { Announcement } from "@/lib/types";

// Anuncios activos del negocio del usuario (para el inicio del cliente).
export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return [];
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return [];
  return (data as Announcement[]) ?? [];
}

// Todos los anuncios del operador (para gestionarlos).
export async function getAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return [];
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as Announcement[]) ?? [];
}

// === Reseñas (⭐) ===
export type ReviewItem = {
  rating: number;
  comment: string | null;
  name: string | null;
  created_at: string;
};

// Reputación pública de un negocio (por código, o el del cliente actual).
export async function getBusinessReviews(code?: string): Promise<{
  businessName: string | null;
  avg: number;
  total: number;
  list: ReviewItem[];
} | null> {
  const supabase = await createClient();
  const arg = code ? { p_code: code } : {};
  const [{ data: sum, error }, { data: list }] = await Promise.all([
    supabase.rpc("business_review_summary", arg),
    supabase.rpc("business_review_list", arg),
  ]);
  if (error) return null; // migración no aplicada
  const s = (Array.isArray(sum) ? sum[0] : sum) as
    | { business_name?: string | null; avg_rating?: number; total?: number }
    | null;
  return {
    businessName: s?.business_name ?? null,
    avg: Number(s?.avg_rating ?? 0),
    total: Number(s?.total ?? 0),
    list: ((list as ReviewItem[]) ?? []).map((r) => ({
      rating: Number(r.rating),
      comment: r.comment ?? null,
      name: r.name ?? null,
      created_at: r.created_at,
    })),
  };
}

// Reseñas propias del cliente (order_id → rating) para saber qué ya calificó.
export async function getMyReviewMap(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return {};
  const { data, error } = await supabase
    .from("reviews")
    .select("order_id, rating")
    .eq("client_id", ctx.userId);
  if (error) return {};
  const map: Record<string, number> = {};
  for (const r of (data as { order_id: string; rating: number }[]) ?? [])
    map[r.order_id] = r.rating;
  return map;
}

// Resumen de reseñas del negocio para el operador (privado): promedio, total y
// promedio por repartidor. Tolerante si falta la tabla.
export async function getOperatorReviewStats(): Promise<{
  avg: number;
  total: number;
  recent: (ReviewItem & { deliverer_id: string | null })[];
} | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return null;
  const { data, error } = await supabase
    .from("reviews")
    .select("rating, comment, created_at, deliverer_id, client_id")
    .eq("operator_id", ctx.tenantId)
    .order("created_at", { ascending: false });
  if (error) return null;
  const rows =
    (data as {
      rating: number;
      comment: string | null;
      created_at: string;
      deliverer_id: string | null;
    }[]) ?? [];
  const total = rows.length;
  const avg = total
    ? rows.reduce((s, r) => s + Number(r.rating), 0) / total
    : 0;
  return {
    avg,
    total,
    recent: rows.slice(0, 5).map((r) => ({
      rating: Number(r.rating),
      comment: r.comment,
      name: null,
      created_at: r.created_at,
      deliverer_id: r.deliverer_id,
    })),
  };
}

// Calificación propia del repartidor (promedio de sus entregas reseñadas).
export async function getMyDelivererRating(): Promise<{
  avg: number;
  total: number;
} | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (ctx.isOperador || !ctx.userId) return null;
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("deliverer_id", ctx.userId);
  if (error) return null;
  const rows = (data as { rating: number }[]) ?? [];
  const total = rows.length;
  const avg = total ? rows.reduce((s, r) => s + Number(r.rating), 0) / total : 0;
  return { avg, total };
}

export async function getSettlements(): Promise<Settlement[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  let query = supabase
    .from("settlements")
    .select("*")
    .order("date", { ascending: false });
  if (ctx.tenantId) query = query.eq("operator_id", ctx.tenantId);
  if (!ctx.isOperador && ctx.userId) query = query.eq("deliverer_id", ctx.userId);
  const { data } = await query;
  return (data as Settlement[]) ?? [];
}

// Registro de actividad (log) del negocio actual.
export interface ActivityEntry {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_label: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ===== Tienda (productos + pedidos) =====

export async function getProducts(): Promise<import("@/lib/types").Product[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return [];
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .order("created_at", { ascending: false });
  return (data as import("@/lib/types").Product[]) ?? [];
}

export async function getActiveProducts(): Promise<
  import("@/lib/types").Product[]
> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return [];
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .eq("active", true)
    .order("category", { ascending: true });
  return (data as import("@/lib/types").Product[]) ?? [];
}

export async function getMyStoreOrders(): Promise<
  import("@/lib/types").StoreOrder[]
> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return [];
  const { data } = await supabase
    .from("store_orders")
    .select("*")
    .eq("client_id", ctx.userId)
    .order("created_at", { ascending: false });
  return (data as import("@/lib/types").StoreOrder[]) ?? [];
}

export async function getStoreOrders(): Promise<
  import("@/lib/types").StoreOrder[]
> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return [];
  const { data } = await supabase
    .from("store_orders")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .order("created_at", { ascending: false });
  return (data as import("@/lib/types").StoreOrder[]) ?? [];
}

// ===== Puntos =====

export async function getMyPoints(): Promise<{
  balance: number;
  entries: import("@/lib/types").PointsEntry[];
}> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return { balance: 0, entries: [] };
  const { data } = await supabase
    .from("points_ledger")
    .select("id, delta, reason, order_id, created_at")
    .eq("client_id", ctx.userId)
    .order("created_at", { ascending: false });
  const entries =
    (data as import("@/lib/types").PointsEntry[]) ?? [];
  const balance = entries.reduce((s, e) => s + Number(e.delta), 0);
  return { balance, entries };
}

// ===== Pedidos =====

// Pedidos del cliente actual (los que él hizo).
export async function getMyOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return [];
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("client_id", ctx.userId)
    .order("created_at", { ascending: false });
  return (data as Order[]) ?? [];
}

// Un pedido concreto del cliente actual (para el detalle).
// Centro de notificaciones (cliente): avisos derivados de sus propios pedidos.
// No hay tabla de notificaciones; los eventos salen de las fechas del pedido y
// lo "nuevo" se calcula contra profiles.notifications_seen_at.
export type AppNotification = {
  id: string;
  title: string;
  body: string;
  url: string;
  at: string;
  kind: "delivered" | "accepted" | "rejected";
};

export async function getMyNotifications(): Promise<{
  items: AppNotification[];
  unread: number;
}> {
  const ctx = await getSessionContext();
  if (!ctx.isCliente || !ctx.userId) return { items: [], unread: 0 };
  const supabase = await createClient();
  const [orders, profRes] = await Promise.all([
    getMyOrders(),
    supabase
      .from("profiles")
      .select("notifications_seen_at")
      .eq("id", ctx.userId)
      .maybeSingle(),
  ]);
  const seenAt =
    (profRes.data as { notifications_seen_at?: string | null } | null)
      ?.notifications_seen_at ?? null;

  const items: AppNotification[] = [];
  for (const o of orders) {
    const who = o.beneficiary_name || "tu familiar";
    const url = `/c/pedidos/${o.id}`;
    if (o.delivered_at) {
      items.push({
        id: `${o.id}:delivered`,
        title: "¡Remesa entregada! ✅",
        body: `Tu envío de $${Number(o.amount_usd)} para ${who} fue entregado.`,
        url,
        at: o.delivered_at,
        kind: "delivered",
      });
    }
    if (o.status === "rechazado") {
      items.push({
        id: `${o.id}:rejected`,
        title: "Pedido rechazado",
        body: o.reject_reason
          ? `Motivo: ${o.reject_reason}`
          : `Tu envío para ${who} no se pudo procesar.`,
        url,
        at: o.accepted_at || o.created_at,
        kind: "rejected",
      });
    } else if (o.accepted_at) {
      items.push({
        id: `${o.id}:accepted`,
        title: "Envío aceptado 📦",
        body: `Ya preparamos tu envío para ${who}.`,
        url,
        at: o.accepted_at,
        kind: "accepted",
      });
    }
  }
  items.sort((a, b) => b.at.localeCompare(a.at));
  const unread = seenAt
    ? items.filter((i) => i.at > seenAt).length
    : items.length;
  return { items: items.slice(0, 30), unread };
}

export async function getMyOrder(id: string): Promise<Order | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return null;
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("client_id", ctx.userId)
    .maybeSingle();
  return (data as Order | null) ?? null;
}

// Beneficiarios que el cliente ya usó (derivados de sus pedidos), para reusar.
export async function getMyBeneficiaries(): Promise<
  { name: string; phone: string | null; province: string | null }[]
> {
  const orders = await getMyOrders();
  const seen = new Set<string>();
  const out: { name: string; phone: string | null; province: string | null }[] =
    [];
  for (const o of orders) {
    const name = o.beneficiary_name?.trim();
    if (!name) continue;
    const key = `${name.toLowerCase()}|${o.beneficiary_phone ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      phone: o.beneficiary_phone ?? null,
      province: o.province ?? null,
    });
    if (out.length >= 12) break;
  }
  return out;
}

// Contacto del negocio del cliente (RPC SECURITY DEFINER — RLS-safe).
export async function getMyOperatorContact(): Promise<{
  businessName: string | null;
  phone: string | null;
  brandHue: number | null;
}> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_operator_contact");
  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        business_name?: string | null;
        phone?: string | null;
        brand_hue?: number | null;
      }
    | null;
  return {
    businessName: row?.business_name ?? null,
    phone: row?.phone ?? null,
    brandHue: row?.brand_hue ?? null,
  };
}

// Pedidos del negocio (para el personal). opts.pendingOnly filtra los pendientes.
export async function getOrders(
  opts: { pendingOnly?: boolean } = {}
): Promise<Order[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return [];
  let q = supabase
    .from("orders")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .order("created_at", { ascending: false });
  if (opts.pendingOnly) q = q.eq("status", "pendiente");
  const { data } = await q;
  return (data as Order[]) ?? [];
}

// ===== Ofertas =====

// Todas las ofertas del negocio (para gestionarlas el operador).
export async function getOffers(): Promise<Offer[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return [];
  const { data } = await supabase
    .from("offers")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .order("created_at", { ascending: false });
  return (data as Offer[]) ?? [];
}

// Ofertas activas y vigentes (las que ve el cliente).
export async function getActiveOffers(): Promise<Offer[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("offers")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .eq("active", true)
    .order("created_at", { ascending: false });
  return ((data as Offer[]) ?? []).filter(
    (o) =>
      (!o.starts_at || o.starts_at <= today) &&
      (!o.ends_at || o.ends_at >= today)
  );
}

// ===== Paquetes de remesa =====

// Todos los paquetes del negocio (para gestionarlos el operador).
export async function getPackages(): Promise<RemittancePackage[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return [];
  const { data } = await supabase
    .from("remittance_packages")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: false });
  return (data as RemittancePackage[]) ?? [];
}

// Paquetes activos (los que ve el cliente).
export async function getActivePackages(): Promise<RemittancePackage[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return [];
  const { data } = await supabase
    .from("remittance_packages")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .eq("active", true)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: false });
  return (data as RemittancePackage[]) ?? [];
}

export async function getActivityLog(limit = 100): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.tenantId) return [];
  let q = supabase
    .from("activity_log")
    .select("*")
    .eq("operator_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  // El repartidor solo ve su propia actividad.
  if (!ctx.isOperador && ctx.userId) q = q.eq("actor_id", ctx.userId);
  const { data } = await q;
  return (data as ActivityEntry[]) ?? [];
}
