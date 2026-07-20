import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SETTINGS,
  type Beneficiary,
  type BusinessSettings,
  type Client,
  type ExchangeRate,
  type Remittance,
  type Settlement,
} from "@/lib/types";

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", true)
    .single();
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as BusinessSettings;
}

// Funciones de lectura para Server Components.

export async function getRemittances(limit?: number): Promise<Remittance[]> {
  const supabase = await createClient();
  let query = supabase
    .from("remittances")
    .select("*, client:clients(*), beneficiary:beneficiaries(*)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
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
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  return (data as Client[]) ?? [];
}

export async function getBeneficiaries(): Promise<Beneficiary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("beneficiaries")
    .select("*")
    .order("name", { ascending: true });
  return (data as Beneficiary[]) ?? [];
}

export async function getExchangeRates(): Promise<ExchangeRate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("currency", { ascending: true });
  return (data as ExchangeRate[]) ?? [];
}

export async function getAlertCount(): Promise<number> {
  const supabase = await createClient();
  const { count: pending } = await supabase
    .from("remittances")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendiente");
  const { count: porCobrar } = await supabase
    .from("remittances")
    .select("id", { count: "exact", head: true })
    .eq("client_paid", false);
  return (pending ?? 0) + (porCobrar ?? 0);
}

export async function getSettlements(): Promise<Settlement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settlements")
    .select("*")
    .order("date", { ascending: false });
  return (data as Settlement[]) ?? [];
}
