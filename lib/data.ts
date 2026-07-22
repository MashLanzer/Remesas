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
export async function getSessionContext(): Promise<SessionContext> {
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

export async function getRepartidores(): Promise<Profile[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  let q = supabase
    .from("profiles")
    .select("id, full_name, role, phone, member_status")
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

// Clientes y beneficiarios son del negocio: los comparten el operador y sus
// repartidores. Solo las remesas son por repartidor (deliverer_id).
export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  let q = supabase.from("clients").select("*").order("name", { ascending: true });
  if (ctx.tenantId) q = q.eq("operator_id", ctx.tenantId);
  const { data } = await q;
  return (data as Client[]) ?? [];
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  return (data as Client) ?? null;
}

export async function getBeneficiary(id: string): Promise<Beneficiary | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("beneficiaries")
    .select("*")
    .eq("id", id)
    .single();
  return (data as Beneficiary) ?? null;
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
  return (data as Beneficiary[]) ?? [];
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

  return (
    (pending ?? 0) + porCobrar + saldoAlert + ratesAlert + teamAlert + ordersAlert
  );
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
