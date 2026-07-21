import { createClient } from "@/lib/supabase/server";
import { calcPartnerBalance } from "@/lib/calc";
import {
  DEFAULT_SETTINGS,
  type Beneficiary,
  type BusinessSettings,
  type Client,
  type ExchangeRate,
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
  tenantId: string | null; // negocio (operador) al que pertenece; null = legacy sin migrar
  memberStatus: string | null; // 'active' | 'pending' | null
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
      tenantId: null,
      memberStatus: null,
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
  } else {
    multiTenant = false;
    const basic = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    row = (basic.data as ProfileRow) ?? null;
  }

  const role = (row?.role as UserRole | null) ?? null;
  const isOperador = role !== "repartidor";
  const tenantId = multiTenant
    ? (row?.operator_id ?? (isOperador ? user.id : null))
    : null;

  return {
    userId: user.id,
    role,
    isOperador,
    tenantId,
    memberStatus: (row?.member_status as string) ?? null,
  };
}

export async function getRepartidores(): Promise<Profile[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  let q = supabase
    .from("profiles")
    .select("id, full_name, role, phone")
    .eq("role", "repartidor")
    .order("full_name", { ascending: true });
  if (ctx.tenantId) q = q.eq("operator_id", ctx.tenantId);
  const { data } = await q;
  return (data as Profile[]) ?? [];
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
  const { data } = await supabase
    .from("remittances")
    .select("*, client:clients(*), beneficiary:beneficiaries(*)")
    .eq("id", id)
    .single();
  return (data as Remittance) ?? null;
}

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador && ctx.userId) {
    // El repartidor solo ve los clientes que aparecen en sus remesas.
    const { data: rem } = await supabase
      .from("remittances")
      .select("client_id")
      .eq("deliverer_id", ctx.userId);
    const ids = Array.from(
      new Set((rem ?? []).map((r) => r.client_id).filter(Boolean))
    ) as string[];
    if (ids.length === 0) return [];
    const { data } = await supabase
      .from("clients")
      .select("*")
      .in("id", ids)
      .order("name", { ascending: true });
    return (data as Client[]) ?? [];
  }
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
  if (!ctx.isOperador && ctx.userId) {
    const { data: rem } = await supabase
      .from("remittances")
      .select("beneficiary_id")
      .eq("deliverer_id", ctx.userId);
    const ids = Array.from(
      new Set((rem ?? []).map((r) => r.beneficiary_id).filter(Boolean))
    ) as string[];
    if (ids.length === 0) return [];
    const { data } = await supabase
      .from("beneficiaries")
      .select("*")
      .in("id", ids)
      .order("name", { ascending: true });
    return (data as Beneficiary[]) ?? [];
  }
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

  let cobrarQ = supabase
    .from("remittances")
    .select("id", { count: "exact", head: true })
    .eq("client_paid", false);
  if (ctx.tenantId) cobrarQ = cobrarQ.eq("operator_id", ctx.tenantId);
  if (mine) cobrarQ = cobrarQ.eq("deliverer_id", mine);
  const { count: porCobrar } = await cobrarQ;

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

  return (pending ?? 0) + (porCobrar ?? 0) + saldoAlert + ratesAlert;
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
