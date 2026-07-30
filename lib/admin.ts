import { createClient } from "@/lib/supabase/server";

// Correo del dueño con acceso al panel de super-admin. Un solo lugar para
// cambiarlo (y debe coincidir con is_superadmin() en 0047_superadmin.sql).
export const OWNER_EMAIL = "brayanibarra0105@gmail.com";

// Correo del usuario logueado (del token verificado por Supabase).
export async function currentUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

// ¿El usuario actual es el super-admin? Comprobación en el servidor.
export async function isSuperAdmin(): Promise<boolean> {
  const email = await currentUserEmail();
  return !!email && email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

export type AdminMetrics = {
  businesses: number;
  operators: number;
  repartidores: number;
  clientes: number;
  users_total: number;
  remesas_total: number;
  volume_usd: number;
  remesas_month: number;
  volume_month: number;
  remesas_pending: number;
  new_users_30d: number;
  clientes_30d: number;
};

export type AdminBusiness = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  business_name: string | null;
  repartidores: number;
  clientes: number;
  remesas: number;
  volume_usd: number;
};

export type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  member_status: string | null;
  operator_id: string | null;
  created_at: string;
  business_name: string | null;
};

export type AdminClient = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  operator_id: string | null;
  business_name: string | null;
  remesas: number;
};

// `ready:false` cuando la migración 0047 aún no se ha corrido (RPC inexistente).
export type AdminData = {
  ready: boolean;
  metrics: AdminMetrics | null;
  businesses: AdminBusiness[];
  users: AdminUser[];
  clients: AdminClient[];
};

const RPC_MISSING = new Set(["42883", "PGRST202"]);

export async function getAdminData(): Promise<AdminData> {
  const supabase = await createClient();

  const [metricsRes, bizRes, usersRes, clientsRes] = await Promise.all([
    supabase.rpc("admin_metrics"),
    supabase.rpc("admin_businesses"),
    supabase.rpc("admin_users", { p_search: null }),
    supabase.rpc("admin_clients"),
  ]);

  // Si el primer RPC no existe, la migración no está corrida.
  if (metricsRes.error && RPC_MISSING.has(metricsRes.error.code ?? "")) {
    return { ready: false, metrics: null, businesses: [], users: [], clients: [] };
  }

  return {
    ready: true,
    metrics: (metricsRes.data as AdminMetrics) ?? null,
    businesses: (bizRes.data as AdminBusiness[]) ?? [],
    users: (usersRes.data as AdminUser[]) ?? [],
    clients: (clientsRes.data as AdminClient[]) ?? [],
  };
}
