"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { computeRemittance, calcCommission, round2 } from "@/lib/calc";
import { getSessionContext } from "@/lib/data";

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

// ============ ONBOARDING / EQUIPO ============

function genCode(len = 6): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I/L
  let s = "";
  for (let i = 0; i < len; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

// Genera un código de equipo que no choque con otro negocio. La comprobación de
// unicidad usa la función SECURITY DEFINER operator_code_taken (0013), porque con
// RLS activa no se pueden leer los perfiles de otros negocios. Si la función aún
// no existe (sin migrar), devuelve el código igualmente (colisión ~imposible).
async function uniqueCode(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const { data: taken, error } = await supabase.rpc("operator_code_taken", {
      p_code: code,
    });
    if (error || !taken) break;
    code = genCode();
  }
  return code;
}

// Registro de operador (negocio): deshabilitado por ahora. Cámbialo a true para
// volver a permitir que cualquiera cree su negocio desde el onboarding.
const OPERADOR_SIGNUP_ENABLED = false;

// El usuario elige ser operador: crea su negocio, código, tasas y ajustes base.
export async function becomeOperador() {
  if (!OPERADOR_SIGNUP_ENABLED) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Código de equipo único (unicidad comprobada con función SECURITY DEFINER,
  // porque con RLS no vemos los perfiles de otros negocios — 0013).
  const code = await uniqueCode(supabase);

  // La transición de rol va por función SECURITY DEFINER (0016).
  await supabase.rpc("become_operador", { p_code: code });

  // Tasas base del nuevo negocio.
  await supabase.from("exchange_rates").upsert(
    [
      { operator_id: user.id, currency: "CUP", rate: 440 },
      { operator_id: user.id, currency: "USD", rate: 1 },
      { operator_id: user.id, currency: "MLC", rate: 1 },
      { operator_id: user.id, currency: "EUR", rate: 0.92 },
    ],
    { onConflict: "operator_id,currency" }
  );
  // Ajustes base.
  await supabase
    .from("business_settings")
    .upsert(
      { operator_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: "operator_id" }
    );

  await logActivity("negocio.crear");
  revalidatePath("/", "layout");
  redirect("/");
}

// El usuario se une a un operador con su código (queda pendiente de aprobación).
export async function joinOperator(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const code = (str(formData.get("code")) ?? "").toUpperCase().replace(/\s/g, "");
  if (!code) return { error: "Escribe el código de tu operador." };

  // Unirse va por función SECURITY DEFINER (join_operator): valida el código y
  // asigna rol/negocio de forma controlada (el usuario no puede hacerlo directo).
  const { data: opId } = await supabase.rpc("join_operator", { p_code: code });
  if (!opId) return { error: "Código no válido. Verifícalo con tu operador." };

  await logActivity("repartidor.solicitud");
  revalidatePath("/", "layout");
  redirect("/pendiente");
}

// El usuario entra como cliente (lado público): ve ofertas y tasas del negocio.
// Registro abierto: se asocia al negocio por defecto (el operador principal).
export async function becomeCliente() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // La transición de rol va por función SECURITY DEFINER (become_cliente):
  // el usuario no puede tocar rol/negocio directamente (0016). Falla si no hay
  // negocio disponible → se queda en el onboarding.
  const { error } = await supabase.rpc("become_cliente");
  if (error) redirect("/onboarding");

  revalidatePath("/", "layout");
  redirect("/c");
}

// ===== Ofertas (las publica el operador) =====

export async function createOffer(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  const { data: inserted } = await supabase
    .from("offers")
    .insert({
      operator_id: ctx.tenantId,
      title: str(formData.get("title")) ?? "Oferta",
      description: str(formData.get("description")),
      kind: str(formData.get("kind")),
      emoji: str(formData.get("emoji")),
      active: true,
      starts_at: str(formData.get("starts_at")),
      ends_at: str(formData.get("ends_at")),
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  const offerId = (inserted as { id?: string } | null)?.id ?? null;
  if (offerId) await uploadOfferImage(supabase, formData, offerId);
  await logActivity("oferta.crear", {
    entityType: "oferta",
    entityLabel: str(formData.get("title")) ?? "Oferta",
  });
  revalidatePath("/ofertas");
  revalidatePath("/c");
}

// Sube la imagen del anuncio (si hay) al bucket público "receipts" (ruta
// offers/…) y guarda la URL. Tolerante: si no hay archivo, no hace nada.
async function uploadOfferImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  offerId: string
) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `offers/${offerId}/img-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return;
  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  await supabase.from("offers").update({ image_url: data.publicUrl }).eq("id", offerId);
}

export async function toggleOffer(id: string, active: boolean) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  await supabase
    .from("offers")
    .update({ active })
    .eq("id", id)
    .eq("operator_id", ctx.tenantId);
  revalidatePath("/ofertas");
  revalidatePath("/c");
}

export async function deleteOffer(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  await supabase
    .from("offers")
    .delete()
    .eq("id", id)
    .eq("operator_id", ctx.tenantId);
  revalidatePath("/ofertas");
  revalidatePath("/c");
}

// ===== Paquetes de remesa (los publica el operador) =====

export async function createPackage(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  const amount = num(formData.get("amount_usd"));
  if (amount <= 0) return; // un paquete sin monto no tiene sentido
  await supabase.from("remittance_packages").insert({
    operator_id: ctx.tenantId,
    title: str(formData.get("title")) ?? "Paquete",
    description: str(formData.get("description")),
    emoji: str(formData.get("emoji")),
    amount_usd: amount,
    delivery_currency: str(formData.get("delivery_currency")),
    highlight: str(formData.get("highlight")),
    active: true,
    created_by: ctx.userId,
  });
  await logActivity("paquete.crear", {
    entityType: "paquete",
    entityLabel: str(formData.get("title")) ?? "Paquete",
  });
  revalidatePath("/paquetes");
  revalidatePath("/c/tienda");
  revalidatePath("/c");
}

export async function togglePackage(id: string, active: boolean) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  await supabase
    .from("remittance_packages")
    .update({ active })
    .eq("id", id)
    .eq("operator_id", ctx.tenantId);
  revalidatePath("/paquetes");
  revalidatePath("/c/tienda");
  revalidatePath("/c");
}

export async function deletePackage(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  await supabase
    .from("remittance_packages")
    .delete()
    .eq("id", id)
    .eq("operator_id", ctx.tenantId);
  revalidatePath("/paquetes");
  revalidatePath("/c/tienda");
  revalidatePath("/c");
}

// ===== Tienda: productos (operador) =====

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  await supabase.from("products").insert({
    operator_id: ctx.tenantId,
    name: str(formData.get("name")) ?? "Producto",
    description: str(formData.get("description")),
    price_usd: num(formData.get("price_usd")),
    category: str(formData.get("category")),
    emoji: str(formData.get("emoji")),
    active: true,
    created_by: ctx.userId,
  });
  revalidatePath("/productos");
  revalidatePath("/c/tienda");
  revalidatePath("/c");
}

export async function toggleProduct(id: string, active: boolean) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  await supabase
    .from("products")
    .update({ active })
    .eq("id", id)
    .eq("operator_id", ctx.tenantId);
  revalidatePath("/productos");
  revalidatePath("/c/tienda");
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("operator_id", ctx.tenantId);
  revalidatePath("/productos");
  revalidatePath("/c/tienda");
}

// ===== Tienda: pedidos (cliente pide, personal gestiona) =====

export async function createStoreOrder(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (ctx.role !== "cliente" || !ctx.tenantId || !ctx.userId) return;

  const productId = str(formData.get("product_id"));
  if (!productId) return;
  // Precio y nombre desde el producto (fuente de verdad, no del cliente).
  const { data: prod } = await supabase
    .from("products")
    .select("name, price_usd, active")
    .eq("id", productId)
    .eq("operator_id", ctx.tenantId)
    .maybeSingle();
  const p = prod as { name?: string; price_usd?: number; active?: boolean } | null;
  if (!p || p.active === false) return;

  const recipient = str(formData.get("recipient_name"));
  if (!recipient) return;
  const qty = Math.max(1, Math.round(num(formData.get("qty")) || 1));
  const price = Number(p.price_usd) || 0;

  const { data: me } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", ctx.userId)
    .single();
  const prof = (me ?? {}) as { full_name?: string | null; phone?: string | null };

  await supabase.from("store_orders").insert({
    operator_id: ctx.tenantId,
    client_id: ctx.userId,
    client_name: prof.full_name ?? null,
    client_phone: prof.phone ?? null,
    product_id: productId,
    product_name: p.name ?? "Producto",
    price_usd: price,
    qty,
    total_usd: round2(price * qty),
    recipient_name: recipient,
    recipient_phone: str(formData.get("recipient_phone")),
    address: str(formData.get("address")),
    note: str(formData.get("note")),
    status: "pendiente",
  });
  revalidatePath("/c/tienda");
  revalidatePath("/c/pedidos");
  redirect("/c/pedidos");
}

export async function cancelStoreOrder(id: string) {
  const supabase = await createClient();
  await supabase
    .from("store_orders")
    .delete()
    .eq("id", id)
    .eq("status", "pendiente");
  revalidatePath("/c/pedidos");
}

export async function acceptStoreOrder(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx) || !ctx.tenantId) return;
  await supabase
    .from("store_orders")
    .update({ status: "aceptado", accepted_by: ctx.userId, accepted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("operator_id", ctx.tenantId)
    .eq("status", "pendiente");
  await logActivity("tienda.aceptar", { entityType: "tienda", entityId: id });
  revalidatePath("/tienda");
  revalidatePath("/c");
}

export async function rejectStoreOrder(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx) || !ctx.tenantId) return;
  await supabase
    .from("store_orders")
    .update({ status: "rechazado", accepted_by: ctx.userId })
    .eq("id", id)
    .eq("operator_id", ctx.tenantId)
    .eq("status", "pendiente");
  await logActivity("tienda.rechazar", { entityType: "tienda", entityId: id });
  revalidatePath("/tienda");
  revalidatePath("/c");
}

export async function markStoreDelivered(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx) || !ctx.tenantId) return;
  await supabase
    .from("store_orders")
    .update({ delivered_at: new Date().toISOString() })
    .eq("id", id)
    .eq("operator_id", ctx.tenantId)
    .eq("status", "aceptado")
    .is("delivered_at", null);
  await logActivity("tienda.entregar", { entityType: "tienda", entityId: id });
  revalidatePath("/tienda");
  revalidatePath("/c");
}

// ===== Pedidos (los crea el cliente; los acepta el personal) =====

function isStaff(ctx: Awaited<ReturnType<typeof getSessionContext>>): boolean {
  return (
    ctx.isOperador ||
    (ctx.role === "repartidor" && ctx.memberStatus === "active")
  );
}

// El cliente pide una remesa. Queda pendiente hasta que el personal la acepte.
export async function createOrder(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (ctx.role !== "cliente" || !ctx.tenantId || !ctx.userId) return;

  // Si el pedido viene de un paquete, el monto y la moneda salen del paquete
  // real (fuente de verdad); el cliente no los fija. El trigger de la base lo
  // blinda además a nivel de datos.
  const packageId = str(formData.get("package_id"));
  let amount = num(formData.get("amount_usd"));
  let currency = str(formData.get("delivery_currency"));
  let note = str(formData.get("note"));
  if (packageId) {
    const { data: pkgRow } = await supabase
      .from("remittance_packages")
      .select("title, amount_usd, delivery_currency, highlight, active")
      .eq("id", packageId)
      .eq("operator_id", ctx.tenantId)
      .maybeSingle();
    const pkg = pkgRow as {
      title?: string;
      amount_usd?: number;
      delivery_currency?: string | null;
      highlight?: string | null;
      active?: boolean;
    } | null;
    if (!pkg || pkg.active === false) return;
    amount = Number(pkg.amount_usd) || 0;
    currency = pkg.delivery_currency ?? currency;
    const label = `Paquete: ${pkg.title ?? "Paquete"}${pkg.highlight ? ` — ${pkg.highlight}` : ""}`;
    note = note ? `${label}\n${note}` : label;
  }

  // Datos mínimos: monto positivo y nombre del beneficiario.
  const benefName = str(formData.get("beneficiary_name"));
  if (amount <= 0 || !benefName) return;

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", ctx.userId)
    .single();
  const p = (prof ?? {}) as { full_name?: string | null; phone?: string | null };

  await supabase.from("orders").insert({
    operator_id: ctx.tenantId,
    client_id: ctx.userId,
    client_name: p.full_name ?? null,
    client_phone: p.phone ?? null,
    amount_usd: amount,
    beneficiary_name: benefName,
    beneficiary_phone: str(formData.get("beneficiary_phone")),
    province: str(formData.get("province")),
    delivery_currency: currency,
    note,
    package_id: packageId,
    redeem: formData.get("redeem") != null,
    status: "pendiente",
  });

  revalidatePath("/c");
  revalidatePath("/c/pedidos");
  redirect("/c/pedidos");
}

// El beneficiario (sin login) confirma que recibió, vía enlace público.
export async function confirmReceived(token: string) {
  const supabase = await createClient();
  await supabase.rpc("track_confirm", { p_token: token });
  revalidatePath(`/t/${token}`);
}

// El cliente cancela su propio pedido pendiente.
export async function cancelOrder(id: string) {
  const supabase = await createClient();
  await supabase.from("orders").delete().eq("id", id).eq("status", "pendiente");
  revalidatePath("/c");
  revalidatePath("/c/pedidos");
}

// El personal rechaza un pedido.
export async function rejectOrder(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx)) return;
  await supabase
    .from("orders")
    .update({ status: "rechazado", accepted_by: ctx.userId })
    .eq("id", id)
    .eq("status", "pendiente");
  await logActivity("pedido.rechazar", { entityType: "pedido", entityId: id });
  revalidatePath("/pedidos");
  revalidatePath("/c");
}

// El personal acepta un pedido → se convierte en remesa (cliente + beneficiario
// + remesa pendiente por cobrar). Si acepta un repartidor, queda asignada a él.
export async function acceptOrder(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx) || !ctx.tenantId) return;

  const tid = ctx.tenantId;

  // "Claim" atómico: marca el pedido como aceptado SOLO si sigue pendiente.
  // Si dos personas (operador y repartidor) lo aceptan a la vez, solo una gana
  // la fila (bloqueo de Postgres); la otra recibe 0 filas y se detiene. Así no
  // se crean remesas duplicadas.
  const { data: claimed } = await supabase
    .from("orders")
    .update({
      status: "aceptado",
      accepted_by: ctx.userId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("operator_id", tid)
    .eq("status", "pendiente")
    .select("*");
  const order = (claimed?.[0] as {
    id: string;
    amount_usd: number;
    client_id?: string | null;
    client_name?: string | null;
    client_phone?: string | null;
    beneficiary_name?: string | null;
    beneficiary_phone?: string | null;
    province?: string | null;
    delivery_currency?: string | null;
    note?: string | null;
    redeem?: boolean | null;
  } | undefined) ?? null;
  if (!order) return; // perdió la carrera o ya no estaba pendiente

  // Devuelve el pedido a "pendiente" (para reintentar) si algo impide crearlo.
  const revertToPending = async () => {
    await supabase
      .from("orders")
      .update({ status: "pendiente", accepted_by: null, accepted_at: null })
      .eq("id", id);
  };

  const currency = order.delivery_currency || "CUP";
  const amountUsd = Number(order.amount_usd) || 0;

  // Datos inválidos: no se puede convertir → vuelve a pendiente.
  if (amountUsd <= 0 || !order.beneficiary_name) {
    await revertToPending();
    return;
  }

  // Tasa del negocio para esa moneda. Sin tasa no se puede convertir bien:
  // vuelve a pendiente para que configuren la tasa y reintenten.
  const { data: rateRow } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("operator_id", tid)
    .eq("currency", currency)
    .maybeSingle();
  const rate = Number((rateRow as { rate?: number } | null)?.rate ?? 0);
  if (rate <= 0) {
    await revertToPending();
    return;
  }

  // Reglas de comisión, % de reparto y config de puntos.
  const { data: settings } = await supabase
    .from("business_settings")
    .select(
      "commission_threshold, commission_percent, commission_flat, point_value_usd, redeem_min_points, redeem_max_pct"
    )
    .eq("operator_id", tid)
    .maybeSingle();
  const rules = (settings ?? {
    commission_threshold: 100,
    commission_percent: 10,
    commission_flat: 5,
  }) as {
    commission_threshold: number;
    commission_percent: number;
    commission_flat: number;
    point_value_usd?: number;
    redeem_min_points?: number;
    redeem_max_pct?: number;
  };
  const { data: meProf } = await supabase
    .from("profiles")
    .select("default_split_percent")
    .eq("id", ctx.userId)
    .single();
  const split =
    Number((meProf as { default_split_percent?: number } | null)?.default_split_percent) || 50;

  // Cliente (reusar por teléfono si ya existe; si no, crear).
  let clientId: string | null = null;
  if (order.client_phone) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("operator_id", tid)
      .eq("phone", order.client_phone)
      .maybeSingle();
    clientId = (existing as { id?: string } | null)?.id ?? null;
  }
  if (!clientId && order.client_name) {
    const { data: c } = await supabase
      .from("clients")
      .insert({
        name: order.client_name,
        phone: order.client_phone,
        operator_id: tid,
      })
      .select("id")
      .single();
    clientId = (c as { id?: string } | null)?.id ?? null;
  }

  // Beneficiario del pedido.
  let beneficiaryId: string | null = null;
  if (order.beneficiary_name) {
    const { data: b } = await supabase
      .from("beneficiaries")
      .insert({
        name: order.beneficiary_name,
        phone: order.beneficiary_phone,
        province: order.province,
        preferred_currency: currency,
        client_id: clientId,
        operator_id: tid,
      })
      .select("id")
      .single();
    beneficiaryId = (b as { id?: string } | null)?.id ?? null;
  }

  // Comisión base. Si el cliente pidió usar puntos, la reserva se hace de forma
  // ATÓMICA en la base (redeem_points, con lock por cliente): así dos pedidos
  // simultáneos no pueden gastar el saldo dos veces. El descuento está topado a
  // un % de la comisión (la casa siempre conserva la mayor parte).
  let commission = calcCommission(amountUsd, rules);
  let pointsUsed = 0;
  let discount = 0;
  if (order.redeem && order.client_id && commission > 0) {
    const pointValue = Number(rules.point_value_usd ?? 0.05) || 0.05;
    const minPts = Math.round(Number(rules.redeem_min_points ?? 100)) || 100;
    const maxPct = Number(rules.redeem_max_pct ?? 50) || 50;
    const { data: rd } = await supabase.rpc("redeem_points", {
      p_client: order.client_id,
      p_order: order.id,
      p_commission: commission,
      p_point_value: pointValue,
      p_min_points: minPts,
      p_max_pct: maxPct,
    });
    const r = (Array.isArray(rd) ? rd[0] : rd) as
      | { points_used?: number; discount?: number }
      | null;
    pointsUsed = Number(r?.points_used) || 0;
    discount = Number(r?.discount) || 0;
    if (discount > 0) commission = round2(commission - discount);
  }

  const c = computeRemittance({
    amountUsd,
    commission,
    exchangeRate: rate,
    exchangeProfit: 0,
    mySplitPercent: split,
  });

  const delivererId = ctx.role === "repartidor" ? ctx.userId : null;

  const { data: rem } = await supabase
    .from("remittances")
    .insert({
      date: new Date().toISOString().slice(0, 10),
      client_id: clientId,
      beneficiary_id: beneficiaryId,
      amount_usd: amountUsd,
      commission: c.commission,
      total_received: c.totalReceived,
      delivery_currency: currency,
      exchange_rate: rate,
      local_amount: c.localAmount,
      exchange_profit: 0,
      total_profit: c.totalProfit,
      my_split_percent: split,
      my_share: c.myShare,
      partner_share: c.partnerShare,
      status: "pendiente",
      notes: order.note,
      created_by: ctx.userId,
      client_paid: false,
      ...(delivererId ? { deliverer_id: delivererId } : {}),
      operator_id: tid,
    })
    .select("id")
    .single();
  const remId = (rem as { id?: string } | null)?.id ?? null;

  // Si la remesa no se creó, devuelve el pedido a pendiente y REEMBOLSA los
  // puntos que ya reservó redeem_points (no queda "aceptado" sin remesa ni el
  // cliente pierde puntos por nada).
  if (!remId) {
    if (pointsUsed > 0 && order.client_id) {
      await supabase.from("points_ledger").insert({
        operator_id: tid,
        client_id: order.client_id,
        delta: pointsUsed,
        reason: "ajuste",
        order_id: order.id,
      });
    }
    await revertToPending();
    return;
  }

  // Los puntos ya se descontaron atómicamente en redeem_points; aquí solo se
  // guarda el resultado en el pedido.
  await supabase
    .from("orders")
    .update({
      remittance_id: remId,
      points_used: pointsUsed || null,
      discount_usd: discount || null,
    })
    .eq("id", id);

  await logActivity("pedido.aceptar", {
    entityType: "pedido",
    entityId: id,
    entityLabel: `$${amountUsd}`,
    details: pointsUsed > 0 ? { descuento: discount, puntos: pointsUsed } : undefined,
  });

  revalidatePath("/pedidos");
  revalidatePath("/remesas");
  revalidatePath("/c");
  revalidatePath("/");
}

// El operador acepta a un repartidor pendiente de su equipo.
export async function approveMember(userId: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  await supabase.rpc("approve_member", { p_user: userId });
  await logActivity("repartidor.aceptar", {
    entityType: "repartidor",
    entityId: userId,
  });
  revalidatePath("/ajustes/repartidores");
}

// El operador quita/rechaza a un repartidor. Sus datos (remesas ya creadas)
// quedan con el operador; la persona se desvincula y vuelve al onboarding.
// Nota: mantenemos operator_id y marcamos member_status='removed' para que la
// política RLS de UPDATE sobre profiles siga cuadrando (operator_id del equipo).
// current_operator_id() ignora a los 'removed', así que dejan de ver datos.
export async function removeMember(userId: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  await supabase.rpc("remove_member", { p_user: userId });
  await logActivity("repartidor.quitar", {
    entityType: "repartidor",
    entityId: userId,
  });
  revalidatePath("/ajustes/repartidores");
}

// El operador regenera su código de equipo (el anterior deja de servir).
export async function regenerateCode() {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.userId) return;
  const code = await uniqueCode(supabase);
  await supabase.rpc("regenerate_code", { p_code: code });
  await logActivity("equipo.codigo");
  revalidatePath("/ajustes/repartidores");
}

function num(v: FormDataEntryValue | null): number {
  let s = String(v ?? "").trim().replace(/\s/g, "");
  if (!s) return 0;
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    // El separador que aparece más a la derecha es el decimal; el otro, miles.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

// Negocio (operador) al que pertenece el usuario actual. null = sin migrar aún.
async function currentTenantId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("operator_id")
    .eq("id", user.id)
    .single();
  if (!data) return null; // columna inexistente (sin migrar)
  return ((data as { operator_id?: string | null }).operator_id as string) ?? user.id;
}

// Registro de actividad. Tolerante: si la tabla no existe todavía, no hace nada.
async function logActivity(
  action: string,
  opts?: {
    entityType?: string;
    entityId?: string | null;
    entityLabel?: string | null;
    details?: Record<string, unknown>;
  }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, role, operator_id")
      .eq("id", user.id)
      .single();
    const prof = (p ?? {}) as {
      full_name?: string | null;
      role?: string | null;
      operator_id?: string | null;
    };
    await supabase.from("activity_log").insert({
      operator_id: prof.operator_id ?? user.id,
      actor_id: user.id,
      actor_name: prof.full_name ?? null,
      actor_role: prof.role ?? null,
      action,
      entity_type: opts?.entityType ?? null,
      entity_id: opts?.entityId ?? null,
      entity_label: opts?.entityLabel ?? null,
      details: opts?.details ?? null,
    });
  } catch {
    /* tolerante */
  }
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
  const ctx = await getSessionContext();

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

  // Repartidor asignado. Si quien crea es repartidor, se auto-asigna a sí mismo.
  let delivererId = str(formData.get("deliverer_id"));
  if (!ctx.isOperador && ctx.userId) delivererId = ctx.userId;

  // "Cobrado del cliente": el repartidor no cobra (lo marca el operador después),
  // así que sus remesas quedan "por cobrar". El operador usa lo que puso en el form.
  const clientPaid = ctx.isOperador
    ? str(formData.get("client_paid")) !== "false"
    : false;

  // El operator_id y deliverer_id van EN el insert: con RLS activa (0013), la
  // política de INSERT exige operator_id = tu negocio, así que no puede ir aparte.
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
      client_paid: clientPaid,
      ...(delivererId ? { deliverer_id: delivererId } : {}),
      ...(ctx.tenantId ? { operator_id: ctx.tenantId } : {}),
    })
    .select("id")
    .single();

  if (inserted?.id) await handleReceiptUpload(supabase, formData, "remittances", inserted.id);

  await logActivity("remesa.crear", {
    entityType: "remesa",
    entityId: inserted?.id ?? null,
    entityLabel: `$${amountUsd}`,
    details: { amount_usd: amountUsd, deliverer_id: delivererId, client_id: str(formData.get("client_id")) },
  });

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

  // Cobrado del cliente: solo lo marca el operador (él recibe el dinero) y solo
  // si el formulario trae el campo. Al repartidor no se le muestra, así que su
  // edición no debe tocar client_paid (si no, se pondría "cobrado" solo).
  const ctx = await getSessionContext();
  const cp = formData.get("client_paid");
  if (ctx.isOperador && cp !== null) {
    await supabase
      .from("remittances")
      .update({ client_paid: cp !== "false" })
      .eq("id", id);
  }

  // Repartidor asignado: solo el operador reasigna (a él se le muestra el campo).
  const delivererId = formData.get("deliverer_id");
  if (ctx.isOperador && delivererId !== null) {
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
  // Solo el operador marca el cobro (él recibe el dinero).
  const ctx = await getSessionContext();
  if (!ctx.isOperador) return;
  await supabase.from("remittances").update({ client_paid: paid }).eq("id", id);
  await logActivity(paid ? "remesa.cobrada" : "remesa.por_cobrar", {
    entityType: "remesa",
    entityId: id,
  });
  revalidatePath("/remesas");
  revalidatePath(`/remesas/${id}`);
}

export async function updateRemittanceStatus(id: string, status: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx)) return; // solo el personal cambia estados
  await supabase.from("remittances").update({ status }).eq("id", id);

  // Refleja la entrega en el pedido vinculado (seguimiento del cliente/
  // beneficiario) y premia con puntos al cliente. Tolerante si no hay pedido.
  if (status === "entregado") {
    const { data: ord } = await supabase
      .from("orders")
      .update({ delivered_at: new Date().toISOString() })
      .eq("remittance_id", id)
      .is("delivered_at", null)
      .select("id, client_id, amount_usd, operator_id");
    const o = ord?.[0] as
      | { id: string; client_id: string | null; amount_usd: number; operator_id: string }
      | undefined;
    // Puntos por la remesa entregada (solo pedidos de clientes registrados).
    if (o?.client_id) {
      const { data: bs } = await supabase
        .from("business_settings")
        .select("points_per_usd")
        .eq("operator_id", o.operator_id)
        .maybeSingle();
      const perUsd = Number((bs as { points_per_usd?: number } | null)?.points_per_usd ?? 1) || 0;
      const pts = Math.floor(Number(o.amount_usd) * perUsd);
      if (pts > 0) {
        await supabase.from("points_ledger").insert({
          operator_id: o.operator_id,
          client_id: o.client_id,
          delta: pts,
          reason: "remesa",
          order_id: o.id,
        });
      }
    }
  } else if (status === "pendiente") {
    await supabase
      .from("orders")
      .update({ delivered_at: null, received_at: null })
      .eq("remittance_id", id);
  }

  await logActivity("remesa.estado", {
    entityType: "remesa",
    entityId: id,
    details: { status },
  });
  revalidatePath("/remesas");
  revalidatePath(`/remesas/${id}`);
  revalidatePath("/");
  revalidatePath("/c");
}

export async function deleteRemittance(id: string) {
  const supabase = await createClient();
  await logActivity("remesa.borrar", { entityType: "remesa", entityId: id });
  // Si esta remesa nació de un pedido de cliente, refléjalo en el pedido: deja
  // de mostrarse "en camino" y queda cancelado (si no, el cliente seguiría
  // viendo un trayecto fantasma en su app).
  await supabase
    .from("orders")
    .update({
      status: "rechazado",
      remittance_id: null,
      accepted_at: null,
      delivered_at: null,
      received_at: null,
    })
    .eq("remittance_id", id);
  await supabase.from("remittances").delete().eq("id", id);
  revalidatePath("/remesas");
  revalidatePath("/");
  revalidatePath("/c");
  revalidatePath("/c/pedidos");
  redirect("/remesas");
}

// El personal cancela un pedido ya ACEPTADO: borra la remesa vinculada (si la
// hay) y devuelve el pedido a "rechazado", limpiando el seguimiento. Así el
// cliente deja de ver un envío que ya no existe.
export async function cancelAcceptedOrder(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx) || !ctx.tenantId) return;

  const { data: ord } = await supabase
    .from("orders")
    .select("remittance_id")
    .eq("id", id)
    .eq("operator_id", ctx.tenantId)
    .maybeSingle();
  const remId =
    (ord as { remittance_id?: string | null } | null)?.remittance_id ?? null;
  if (remId) {
    await supabase
      .from("remittances")
      .delete()
      .eq("id", remId)
      .eq("operator_id", ctx.tenantId);
  }

  await supabase
    .from("orders")
    .update({
      status: "rechazado",
      remittance_id: null,
      accepted_at: null,
      delivered_at: null,
      received_at: null,
    })
    .eq("id", id)
    .eq("operator_id", ctx.tenantId);

  await logActivity("pedido.cancelar", { entityType: "pedido", entityId: id });
  revalidatePath("/pedidos");
  revalidatePath("/remesas");
  revalidatePath("/");
  revalidatePath("/c");
  revalidatePath("/c/pedidos");
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
    const tid = await currentTenantId();
    await supabase
      .from("clients")
      .insert({ ...values, ...(tid ? { operator_id: tid } : {}) });
    await logActivity("cliente.crear", {
      entityType: "cliente",
      entityLabel: values.name,
    });
  }
  revalidatePath("/agenda");
}

// Crea un cliente y, opcionalmente, sus beneficiarios en Cuba (vinculados) en
// un solo paso. Los beneficiarios vacíos se ignoran.
export async function createContact(formData: FormData) {
  const supabase = await createClient();
  const tid = await currentTenantId();
  const clientName = str(formData.get("name")) ?? "Sin nombre";

  const { data: client } = await supabase
    .from("clients")
    .insert({
      name: clientName,
      phone: str(formData.get("phone")),
      country: str(formData.get("country")),
      notes: str(formData.get("notes")),
      ...(tid ? { operator_id: tid } : {}),
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
      ...(tid ? { operator_id: tid } : {}),
    }))
    .filter((r) => r.name); // solo los que tienen nombre

  if (rows.length > 0) {
    await supabase.from("beneficiaries").insert(rows);
  }

  await logActivity("contacto.crear", {
    entityType: "cliente",
    entityId: clientId,
    entityLabel: clientName,
    details: { beneficiarios: rows.length },
  });

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
    // El operator_id va EN el insert: con RLS la política de INSERT exige
    // operator_id = tu negocio, así que no puede ir en un update aparte.
    const tid = await currentTenantId();
    const { data } = await supabase
      .from("beneficiaries")
      .insert({ ...values, ...(tid ? { operator_id: tid } : {}) })
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
  const tid = await currentTenantId();

  // ¿Cambió respecto a la tasa actual? (para no llenar el historial de duplicados)
  let existQ = supabase
    .from("exchange_rates")
    .select("rate")
    .eq("currency", currency);
  if (tid) existQ = existQ.eq("operator_id", tid);
  const { data: existing } = await existQ.maybeSingle();
  const changed = !existing || Number(existing.rate) !== rate;

  await supabase.from("exchange_rates").upsert(
    {
      currency,
      rate,
      updated_at: new Date().toISOString(),
      ...(tid ? { operator_id: tid } : {}),
    },
    { onConflict: tid ? "operator_id,currency" : "currency" }
  );

  // Historial de cambios (tolerante si la tabla no existe — 0008).
  if (changed) {
    await supabase
      .from("rate_history")
      .insert({ currency, rate, ...(tid ? { operator_id: tid } : {}) });
  }

  // Tasa de mercado / referencia (aparte, tolerante — columna 0009).
  const marketRaw = formData.get("market_rate");
  if (marketRaw !== null) {
    const trimmed = String(marketRaw).trim();
    let uq = supabase
      .from("exchange_rates")
      .update({ market_rate: trimmed === "" ? null : num(marketRaw) })
      .eq("currency", currency);
    if (tid) uq = uq.eq("operator_id", tid);
    await uq;
  }

  revalidatePath("/tasas");
  revalidatePath("/remesas/nueva");
}

export async function toggleCurrencyActive(formData: FormData) {
  const supabase = await createClient();
  const currency = str(formData.get("currency"));
  const active = String(formData.get("active")) === "true";
  if (!currency) return;
  const tid = await currentTenantId();
  let uq = supabase
    .from("exchange_rates")
    .update({ active })
    .eq("currency", currency);
  if (tid) uq = uq.eq("operator_id", tid);
  await uq;
  revalidatePath("/tasas");
  revalidatePath("/remesas/nueva");
}

export async function importRates(formData: FormData) {
  const supabase = await createClient();
  const raw = String(formData.get("raw") ?? "");
  const valid = ["CUP", "USD", "MLC", "EUR"];
  const seen = new Set<string>();
  const tid = await currentTenantId();
  // Reconoce líneas tipo "CUP 440", "MLC: 260", "eur = 0.92"
  for (const line of raw.split(/[\n,;]+/)) {
    const m = line.trim().match(/([A-Za-z]{3})\s*[:=]?\s*([\d.,]+)/);
    if (!m) continue;
    const currency = m[1].toUpperCase();
    if (!valid.includes(currency) || seen.has(currency)) continue;
    const rate = parseFloat(m[2].replace(",", "."));
    if (isNaN(rate) || rate <= 0) continue;
    seen.add(currency);

    let existQ = supabase
      .from("exchange_rates")
      .select("rate")
      .eq("currency", currency);
    if (tid) existQ = existQ.eq("operator_id", tid);
    const { data: existing } = await existQ.maybeSingle();
    const changed = !existing || Number(existing.rate) !== rate;

    await supabase.from("exchange_rates").upsert(
      {
        currency,
        rate,
        updated_at: new Date().toISOString(),
        ...(tid ? { operator_id: tid } : {}),
      },
      { onConflict: tid ? "operator_id,currency" : "currency" }
    );
    if (changed) {
      await supabase
        .from("rate_history")
        .insert({ currency, rate, ...(tid ? { operator_id: tid } : {}) });
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

  const tid = await currentTenantId();
  let targetId = id;
  if (id) {
    await supabase.from("settlements").update(values).eq("id", id);
  } else {
    const { data } = await supabase
      .from("settlements")
      .insert({
        ...values,
        created_by: user?.id ?? null,
        ...(tid ? { operator_id: tid } : {}),
      })
      .select("id")
      .single();
    targetId = data?.id ?? null;
    await logActivity("pago.crear", {
      entityType: "pago",
      entityId: targetId,
      entityLabel: `$${values.amount}`,
      details: { direction: values.direction },
    });
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
  const tid = await currentTenantId();
  // Clave del registro: por operador (0012) o legacy (id=true).
  const keyField = tid ? "operator_id" : "id";
  const keyVal: string | boolean = tid ?? true;

  await supabase.from("business_settings").upsert(
    {
      [keyField]: keyVal,
      commission_threshold: num(formData.get("commission_threshold")),
      commission_percent: num(formData.get("commission_percent")),
      commission_flat: num(formData.get("commission_flat")),
      default_currency: str(formData.get("default_currency")) ?? "CUP",
      default_payment_method: str(formData.get("default_payment_method")),
      business_name: str(formData.get("business_name")),
      partner_name: str(formData.get("partner_name")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: keyField }
  );
  // Umbral de recordatorio (aparte, tolerante si la columna no existe — 0006).
  const threshold = formData.get("settle_threshold");
  if (threshold !== null && String(threshold).trim() !== "") {
    await supabase
      .from("business_settings")
      .update({ settle_threshold: num(threshold) })
      .eq(keyField, keyVal);
  }
  // Meta de ganancia mensual (aparte, tolerante si la columna no existe — 0007).
  const goal = formData.get("monthly_goal");
  if (goal !== null) {
    const trimmed = String(goal).trim();
    await supabase
      .from("business_settings")
      .update({ monthly_goal: trimmed === "" ? null : num(goal) })
      .eq(keyField, keyVal);
  }
  // Puntos por USD para el cliente (aparte, tolerante — 0018).
  const ppu = formData.get("points_per_usd");
  if (ppu !== null) {
    const trimmed = String(ppu).trim();
    await supabase
      .from("business_settings")
      .update({ points_per_usd: trimmed === "" ? 1 : num(ppu) })
      .eq(keyField, keyVal);
  }
  // Config del canje (aparte, tolerante — 0019).
  const pv = formData.get("point_value_usd");
  const rmin = formData.get("redeem_min_points");
  const rmax = formData.get("redeem_max_pct");
  if (pv !== null || rmin !== null || rmax !== null) {
    const patch: Record<string, number> = {};
    if (pv !== null && String(pv).trim() !== "") patch.point_value_usd = num(pv);
    if (rmin !== null && String(rmin).trim() !== "")
      patch.redeem_min_points = Math.round(num(rmin));
    if (rmax !== null && String(rmax).trim() !== "")
      patch.redeem_max_pct = num(rmax);
    if (Object.keys(patch).length > 0) {
      await supabase.from("business_settings").update(patch).eq(keyField, keyVal);
    }
  }
  revalidatePath("/ajustes");
  revalidatePath("/remesas/nueva");
  revalidatePath("/socios");
  revalidatePath("/reportes");
  revalidatePath("/c");
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
