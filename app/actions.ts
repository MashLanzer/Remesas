"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeRemittance } from "@/lib/calc";

function num(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

// ============ REMESAS ============

export async function createRemittance(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const amountUsd = num(formData.get("amount_usd"));
  const commission = num(formData.get("commission"));
  const exchangeRate = num(formData.get("exchange_rate"));
  const exchangeProfit = num(formData.get("exchange_profit"));
  const mySplitPercent = num(formData.get("my_split_percent"));

  const c = computeRemittance({
    amountUsd,
    commission,
    exchangeRate,
    exchangeProfit,
    mySplitPercent,
  });

  await supabase.from("remittances").insert({
    date: str(formData.get("date")) ?? new Date().toISOString().slice(0, 10),
    client_id: str(formData.get("client_id")),
    beneficiary_id: str(formData.get("beneficiary_id")),
    amount_usd: amountUsd,
    commission: c.commission,
    total_received: c.totalReceived,
    payment_method: str(formData.get("payment_method")),
    delivery_currency: str(formData.get("delivery_currency")) ?? "CUP",
    exchange_rate: exchangeRate,
    local_amount: c.localAmount,
    exchange_profit: exchangeProfit,
    total_profit: c.totalProfit,
    my_split_percent: mySplitPercent,
    my_share: c.myShare,
    partner_share: c.partnerShare,
    status: str(formData.get("status")) ?? "pendiente",
    notes: str(formData.get("notes")),
    created_by: user?.id ?? null,
  });

  revalidatePath("/remesas");
  revalidatePath("/");
  redirect("/remesas");
}

export async function updateRemittanceStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("remittances").update({ status }).eq("id", id);
  revalidatePath("/remesas");
  revalidatePath(`/remesas/${id}`);
  revalidatePath("/");
}

export async function deleteRemittance(id: string) {
  const supabase = await createClient();
  await supabase.from("remittances").delete().eq("id", id);
  revalidatePath("/remesas");
  revalidatePath("/");
  redirect("/remesas");
}

// ============ CLIENTES ============

export async function createClientRecord(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("clients").insert({
    name: str(formData.get("name")) ?? "Sin nombre",
    phone: str(formData.get("phone")),
    country: str(formData.get("country")),
    notes: str(formData.get("notes")),
  });
  revalidatePath("/agenda");
}

export async function deleteClientRecord(id: string) {
  const supabase = await createClient();
  await supabase.from("clients").delete().eq("id", id);
  revalidatePath("/agenda");
}

// ============ BENEFICIARIOS ============

export async function createBeneficiary(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("beneficiaries").insert({
    name: str(formData.get("name")) ?? "Sin nombre",
    phone: str(formData.get("phone")),
    province: str(formData.get("province")),
    preferred_currency: str(formData.get("preferred_currency")),
    id_card: str(formData.get("id_card")),
    client_id: str(formData.get("client_id")),
    notes: str(formData.get("notes")),
  });
  revalidatePath("/agenda");
}

export async function deleteBeneficiary(id: string) {
  const supabase = await createClient();
  await supabase.from("beneficiaries").delete().eq("id", id);
  revalidatePath("/agenda");
}

// ============ TASAS ============

export async function upsertRate(formData: FormData) {
  const supabase = await createClient();
  const currency = str(formData.get("currency"));
  const rate = num(formData.get("rate"));
  if (!currency) return;
  await supabase
    .from("exchange_rates")
    .upsert(
      { currency, rate, updated_at: new Date().toISOString() },
      { onConflict: "currency" }
    );
  revalidatePath("/tasas");
  revalidatePath("/remesas/nueva");
}

// ============ LIQUIDACIONES ============

export async function createSettlement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("settlements").insert({
    date: str(formData.get("date")) ?? new Date().toISOString().slice(0, 10),
    amount: num(formData.get("amount")),
    direction: str(formData.get("direction")) ?? "us_to_cuba",
    method: str(formData.get("method")),
    notes: str(formData.get("notes")),
    created_by: user?.id ?? null,
  });
  revalidatePath("/socios");
  revalidatePath("/");
}

export async function deleteSettlement(id: string) {
  const supabase = await createClient();
  await supabase.from("settlements").delete().eq("id", id);
  revalidatePath("/socios");
  revalidatePath("/");
}

// ============ PERFIL / AJUSTES ============

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({
      full_name: str(formData.get("full_name")),
      default_split_percent: num(formData.get("default_split_percent")),
    })
    .eq("id", user.id);
  revalidatePath("/ajustes");
}
