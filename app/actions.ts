"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { computeRemittance } from "@/lib/calc";

const YEAR = 60 * 60 * 24 * 365;

// Persistir preferencias por HTTP Set-Cookie (más fiable en el WebView del APK
// que document.cookie, igual que la cookie de sesión).
export async function setThemeCookie(dark: boolean) {
  cookies().set("theme", dark ? "dark" : "light", {
    path: "/",
    maxAge: YEAR,
    sameSite: "lax",
  });
}

export async function setDataModeCookie(low: boolean) {
  cookies().set("datamode", low ? "low" : "normal", {
    path: "/",
    maxAge: YEAR,
    sameSite: "lax",
  });
}

// Solo el operador puede cambiar roles.
export async function setUserRole(
  userId: string,
  role: "operador" | "repartidor"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (((me?.role as string) || "operador") === "repartidor") return;
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/ajustes/repartidores");
}

function num(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

// Sube la foto del comprobante (si hay) y guarda la URL. Tolerante: si el
// bucket o la columna aún no existen (migración 0004), simplemente no hace nada.
async function handleReceiptUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  table: "remittances" | "settlements",
  id: string
) {
  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) return;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${table}/${id}/comprobante-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return;
  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  await supabase
    .from(table)
    .update({ receipt_url: data.publicUrl })
    .eq("id", id);
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

  const { data: inserted } = await supabase
    .from("remittances")
    .insert({
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
    })
    .select("id")
    .single();

  // "Cobrado del cliente" se escribe aparte para no romper si la columna
  // aún no existe (requiere la migración 0003).
  if (inserted?.id && str(formData.get("client_paid")) === "false") {
    await supabase
      .from("remittances")
      .update({ client_paid: false })
      .eq("id", inserted.id);
  }

  // Repartidor asignado (aparte, tolerante — columna 0011).
  const delivererId = str(formData.get("deliverer_id"));
  if (inserted?.id && delivererId) {
    await supabase
      .from("remittances")
      .update({ deliverer_id: delivererId })
      .eq("id", inserted.id);
  }

  if (inserted?.id) await handleReceiptUpload(supabase, formData, "remittances", inserted.id);

  revalidatePath("/remesas");
  revalidatePath("/");
  redirect("/remesas");
}

export async function updateRemittance(formData: FormData) {
  const supabase = await createClient();
  const id = str(formData.get("id"));
  if (!id) return;

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

  await supabase
    .from("remittances")
    .update({
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
    })
    .eq("id", id);

  // Cobrado del cliente (aparte, tolerante si la columna no existe).
  await supabase
    .from("remittances")
    .update({ client_paid: str(formData.get("client_paid")) !== "false" })
    .eq("id", id);

  // Repartidor asignado (aparte, tolerante — columna 0011).
  const delivererId = formData.get("deliverer_id");
  if (delivererId !== null) {
    await supabase
      .from("remittances")
      .update({ deliverer_id: str(delivererId) })
      .eq("id", id);
  }

  await handleReceiptUpload(supabase, formData, "remittances", id);

  revalidatePath("/remesas");
  revalidatePath(`/remesas/${id}`);
  revalidatePath("/");
  redirect(`/remesas/${id}`);
}

export async function setClientPaid(id: string, paid: boolean) {
  const supabase = await createClient();
  await supabase.from("remittances").update({ client_paid: paid }).eq("id", id);
  revalidatePath("/remesas");
  revalidatePath(`/remesas/${id}`);
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
  const id = str(formData.get("id"));
  const values = {
    name: str(formData.get("name")) ?? "Sin nombre",
    phone: str(formData.get("phone")),
    country: str(formData.get("country")),
    notes: str(formData.get("notes")),
  };
  if (id) {
    await supabase.from("clients").update(values).eq("id", id);
    revalidatePath(`/agenda/cliente/${id}`);
  } else {
    await supabase.from("clients").insert(values);
  }
  revalidatePath("/agenda");
}

// Crea un cliente y, opcionalmente, sus beneficiarios en Cuba (vinculados) en
// un solo paso. Los beneficiarios vacíos se ignoran.
export async function createContact(formData: FormData) {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .insert({
      name: str(formData.get("name")) ?? "Sin nombre",
      phone: str(formData.get("phone")),
      country: str(formData.get("country")),
      notes: str(formData.get("notes")),
    })
    .select("id")
    .single();

  const clientId = client?.id ?? null;

  const names = formData.getAll("benef_name");
  const phones = formData.getAll("benef_phone");
  const provinces = formData.getAll("benef_province");
  const currencies = formData.getAll("benef_currency");
  const cards = formData.getAll("benef_id_card");

  const rows = names
    .map((n, i) => ({
      name: str(n as FormDataEntryValue),
      phone: str((phones[i] ?? null) as FormDataEntryValue),
      province: str((provinces[i] ?? null) as FormDataEntryValue),
      preferred_currency: str((currencies[i] ?? null) as FormDataEntryValue),
      id_card: str((cards[i] ?? null) as FormDataEntryValue),
      client_id: clientId,
    }))
    .filter((r) => r.name); // solo los que tienen nombre

  if (rows.length > 0) {
    await supabase.from("beneficiaries").insert(rows);
  }

  revalidatePath("/agenda");
  redirect(clientId ? `/agenda/cliente/${clientId}` : "/agenda");
}

export async function deleteClientRecord(id: string) {
  const supabase = await createClient();
  await supabase.from("clients").delete().eq("id", id);
  revalidatePath("/agenda");
}

// ============ BENEFICIARIOS ============

export async function createBeneficiary(formData: FormData) {
  const supabase = await createClient();
  const id = str(formData.get("id"));
  const values = {
    name: str(formData.get("name")) ?? "Sin nombre",
    phone: str(formData.get("phone")),
    province: str(formData.get("province")),
    preferred_currency: str(formData.get("preferred_currency")),
    id_card: str(formData.get("id_card")),
    client_id: str(formData.get("client_id")),
    notes: str(formData.get("notes")),
  };
  let targetId = id;
  if (id) {
    await supabase.from("beneficiaries").update(values).eq("id", id);
  } else {
    const { data } = await supabase
      .from("beneficiaries")
      .insert(values)
      .select("id")
      .single();
    targetId = data?.id ?? null;
  }

  // Método de entrega preferido, aparte (tolerante si la columna no existe).
  if (targetId) {
    await supabase
      .from("beneficiaries")
      .update({ preferred_delivery: str(formData.get("preferred_delivery")) })
      .eq("id", targetId);
    revalidatePath(`/agenda/beneficiario/${targetId}`);
  }
  revalidatePath("/agenda");
}

export async function togglePin(
  kind: "cliente" | "beneficiario",
  id: string,
  pinned: boolean
) {
  const supabase = await createClient();
  const table = kind === "cliente" ? "clients" : "beneficiaries";
  await supabase.from(table).update({ pinned }).eq("id", id);
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${kind}/${id}`);
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

  // ¿Cambió respecto a la tasa actual? (para no llenar el historial de duplicados)
  const { data: existing } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("currency", currency)
    .single();
  const changed = !existing || Number(existing.rate) !== rate;

  await supabase
    .from("exchange_rates")
    .upsert(
      { currency, rate, updated_at: new Date().toISOString() },
      { onConflict: "currency" }
    );

  // Historial de cambios (tolerante si la tabla no existe — 0008).
  if (changed) {
    await supabase.from("rate_history").insert({ currency, rate });
  }

  // Tasa de mercado / referencia (aparte, tolerante — columna 0009).
  const marketRaw = formData.get("market_rate");
  if (marketRaw !== null) {
    const trimmed = String(marketRaw).trim();
    await supabase
      .from("exchange_rates")
      .update({ market_rate: trimmed === "" ? null : num(marketRaw) })
      .eq("currency", currency);
  }

  revalidatePath("/tasas");
  revalidatePath("/remesas/nueva");
}

export async function toggleCurrencyActive(formData: FormData) {
  const supabase = await createClient();
  const currency = str(formData.get("currency"));
  const active = String(formData.get("active")) === "true";
  if (!currency) return;
  // Tolerante si la columna 'active' no existe todavía (0009).
  await supabase
    .from("exchange_rates")
    .update({ active })
    .eq("currency", currency);
  revalidatePath("/tasas");
  revalidatePath("/remesas/nueva");
}

export async function importRates(formData: FormData) {
  const supabase = await createClient();
  const raw = String(formData.get("raw") ?? "");
  const valid = ["CUP", "USD", "MLC", "EUR"];
  const seen = new Set<string>();
  // Reconoce líneas tipo "CUP 440", "MLC: 260", "eur = 0.92"
  for (const line of raw.split(/[\n,;]+/)) {
    const m = line.trim().match(/([A-Za-z]{3})\s*[:=]?\s*([\d.,]+)/);
    if (!m) continue;
    const currency = m[1].toUpperCase();
    if (!valid.includes(currency) || seen.has(currency)) continue;
    const rate = parseFloat(m[2].replace(",", "."));
    if (isNaN(rate) || rate <= 0) continue;
    seen.add(currency);

    const { data: existing } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("currency", currency)
      .single();
    const changed = !existing || Number(existing.rate) !== rate;

    await supabase
      .from("exchange_rates")
      .upsert(
        { currency, rate, updated_at: new Date().toISOString() },
        { onConflict: "currency" }
      );
    if (changed) {
      await supabase.from("rate_history").insert({ currency, rate });
    }
  }
  revalidatePath("/tasas");
  revalidatePath("/remesas/nueva");
}

// ============ LIQUIDACIONES ============

export async function createSettlement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = str(formData.get("id"));
  const values = {
    date: str(formData.get("date")) ?? new Date().toISOString().slice(0, 10),
    amount: num(formData.get("amount")),
    direction: str(formData.get("direction")) ?? "us_to_cuba",
    method: str(formData.get("method")),
    notes: str(formData.get("notes")),
  };

  let targetId = id;
  if (id) {
    await supabase.from("settlements").update(values).eq("id", id);
  } else {
    const { data } = await supabase
      .from("settlements")
      .insert({ ...values, created_by: user?.id ?? null })
      .select("id")
      .single();
    targetId = data?.id ?? null;
  }

  // Repartidor con quien se salda (aparte, tolerante — columna 0011).
  const delivererId = formData.get("deliverer_id");
  if (targetId && delivererId !== null) {
    await supabase
      .from("settlements")
      .update({ deliverer_id: str(delivererId) })
      .eq("id", targetId);
  }

  if (targetId) await handleReceiptUpload(supabase, formData, "settlements", targetId);

  revalidatePath("/socios");
  revalidatePath("/finanzas");
  revalidatePath("/");
}

export async function deleteSettlement(id: string) {
  const supabase = await createClient();
  await supabase.from("settlements").delete().eq("id", id);
  revalidatePath("/socios");
  revalidatePath("/");
}

// ============ PERFIL / AJUSTES ============

export async function updateBusinessSettings(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("business_settings").upsert({
    id: true,
    commission_threshold: num(formData.get("commission_threshold")),
    commission_percent: num(formData.get("commission_percent")),
    commission_flat: num(formData.get("commission_flat")),
    default_currency: str(formData.get("default_currency")) ?? "CUP",
    default_payment_method: str(formData.get("default_payment_method")),
    business_name: str(formData.get("business_name")),
    partner_name: str(formData.get("partner_name")),
    updated_at: new Date().toISOString(),
  });
  // Umbral de recordatorio (aparte, tolerante si la columna no existe — 0006).
  const threshold = formData.get("settle_threshold");
  if (threshold !== null && String(threshold).trim() !== "") {
    await supabase
      .from("business_settings")
      .update({ settle_threshold: num(threshold) })
      .eq("id", true);
  }
  // Meta de ganancia mensual (aparte, tolerante si la columna no existe — 0007).
  const goal = formData.get("monthly_goal");
  if (goal !== null) {
    const trimmed = String(goal).trim();
    await supabase
      .from("business_settings")
      .update({ monthly_goal: trimmed === "" ? null : num(goal) })
      .eq("id", true);
  }
  revalidatePath("/ajustes");
  revalidatePath("/remesas/nueva");
  revalidatePath("/socios");
  revalidatePath("/reportes");
}

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
  // Campos nuevos (aparte, tolerante si las columnas no existen — 0010).
  await supabase
    .from("profiles")
    .update({
      phone: str(formData.get("phone")),
      zelle: str(formData.get("zelle")),
      cashapp: str(formData.get("cashapp")),
      paypal: str(formData.get("paypal")),
    })
    .eq("id", user.id);
  revalidatePath("/perfil");
  revalidatePath("/ajustes");
}
