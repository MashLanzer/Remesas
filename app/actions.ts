"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { computeRemittance, calcCommission, round2, transferFactor } from "@/lib/calc";
import { getSessionContext } from "@/lib/data";
import {
  notify,
  notifyVaquitaContribution,
  notifyAnnouncement,
} from "@/lib/push";
import { signDoc } from "@/lib/storage";

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

// Idioma de la experiencia del cliente (es | en).
export async function setLangCookie(lang: "es" | "en") {
  cookies().set("giro_lang", lang === "en" ? "en" : "es", {
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

  // Aviso al operador de que alguien quiere unirse.
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const name = (prof as { full_name?: string } | null)?.full_name || "Alguien";
  await notify([opId as unknown as string], {
    type: "equipo_solicitud",
    title: "Solicitud de repartidor 🛵",
    body: `${name} quiere unirse a tu equipo.`,
    url: "/ajustes/repartidores",
    operatorId: opId as unknown as string,
  });

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

  // Si llegó por un link de invitación, adjunta a quien lo refirió (tolerante
  // si aún no está la migración 0043).
  const ref = cookies().get("giro_ref")?.value;
  if (ref) {
    try {
      await supabase.rpc("apply_referral", { p_code: ref });
    } catch {
      /* migración no aplicada aún */
    }
    cookies().delete("giro_ref");
  }

  revalidatePath("/", "layout");
  redirect("/c");
}

// ===== Anuncios del operador =====

export async function createAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  const title = str(formData.get("title"));
  if (!title) return;
  const id = str(formData.get("id"));
  const audRaw = str(formData.get("audience"));
  const audience =
    audRaw === "repartidores" || audRaw === "ambos" ? audRaw : "clientes";
  const values = {
    title,
    body: str(formData.get("body")),
    emoji: str(formData.get("emoji")),
  };

  let annId: string | null = id || null;
  if (id) {
    // Editar. Se intenta con audiencia; si la columna no existe (migración 0071
    // sin aplicar), se reintenta sin ella.
    const upd = await supabase
      .from("announcements")
      .update({ ...values, audience })
      .eq("id", id)
      .eq("operator_id", ctx.tenantId);
    if (upd.error) {
      await supabase
        .from("announcements")
        .update(values)
        .eq("id", id)
        .eq("operator_id", ctx.tenantId);
    }
  } else {
    const withAud = await supabase
      .from("announcements")
      .insert({ operator_id: ctx.tenantId, ...values, audience, active: true })
      .select("id")
      .single();
    if (withAud.error) {
      const plain = await supabase
        .from("announcements")
        .insert({ operator_id: ctx.tenantId, ...values, active: true })
        .select("id")
        .single();
      annId = (plain.data as { id?: string } | null)?.id ?? null;
    } else {
      annId = (withAud.data as { id?: string } | null)?.id ?? null;
    }
  }

  if (annId) await uploadAnnouncementImage(supabase, formData, annId);
  // Al crear (no editar), avisa a la audiencia elegida.
  if (!id) {
    await notifyAnnouncement(ctx.tenantId, audience, {
      emoji: values.emoji,
      title,
      body: values.body,
    });
  }
  await logActivity(id ? "anuncio.editar" : "anuncio.crear", {
    entityType: "anuncio",
    entityLabel: title,
  });
  revalidatePath("/ajustes");
  revalidatePath("/anuncios");
  revalidatePath("/", "layout");
  revalidatePath("/c", "layout");
}

// Sube la imagen del anuncio (si hay) al bucket público "receipts" y guarda la
// URL. Tolerante: sin archivo o si la columna image_url no existe, no rompe.
async function uploadAnnouncementImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  announcementId: string
) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return;
  if (!(await validUpload(file))) return;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `announcements/${announcementId}/img-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return;
  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  await supabase
    .from("announcements")
    .update({ image_url: data.publicUrl })
    .eq("id", announcementId);
}

export async function toggleAnnouncement(id: string, active: boolean) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador) return;
  await supabase.from("announcements").update({ active }).eq("id", id);
  revalidatePath("/ajustes");
  revalidatePath("/anuncios");
  revalidatePath("/", "layout");
  revalidatePath("/c", "layout");
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador) return;
  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath("/ajustes");
  revalidatePath("/anuncios");
  revalidatePath("/", "layout");
  revalidatePath("/c", "layout");
}

// El cliente califica un envío suyo ya entregado (verificado por RPC 0044).
export async function submitReview(
  orderId: string,
  rating: number,
  comment: string
) {
  const supabase = await createClient();
  await supabase.rpc("submit_review", {
    p_order: orderId,
    p_rating: rating,
    p_comment: comment,
  });
  // Aviso al operador de la nueva reseña.
  const { data } = await supabase
    .from("orders")
    .select("operator_id, client_name")
    .eq("id", orderId)
    .maybeSingle();
  const o = data as { operator_id?: string; client_name?: string } | null;
  if (o?.operator_id) {
    const clean = (comment || "").trim();
    await notify([o.operator_id], {
      type: "resena",
      title: "Nueva reseña ⭐",
      body: `${o.client_name || "Un cliente"} calificó con ${rating}★${
        clean ? `: "${clean.slice(0, 80)}"` : ""
      }.`,
      url: "/ajustes",
      operatorId: o.operator_id,
    });
  }
  revalidatePath("/c/pedidos");
  revalidatePath(`/c/pedidos/${orderId}`);
  revalidatePath("/c/opiniones");
}

// El cliente edita sus datos básicos (nombre y teléfono).
export async function updateClientProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const base = {
    full_name: str(formData.get("full_name")),
    phone: str(formData.get("phone")),
    phone2: str(formData.get("phone2")),
    address: str(formData.get("address")),
  };
  // Si las columnas phone2/address aún no existen (migración 0062 sin aplicar),
  // se reintenta solo con los campos de siempre para no bloquear el guardado.
  const { error } = await supabase
    .from("profiles")
    .update(base)
    .eq("id", user.id);
  if (error) {
    await supabase
      .from("profiles")
      .update({ full_name: base.full_name, phone: base.phone })
      .eq("id", user.id);
  }
  // Foto de perfil (tolerante — columna 0027).
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0 && (await validUpload(avatar))) {
    const ext = (avatar.name.split(".").pop() || "jpg").toLowerCase();
    const path = `avatars/${user.id}/a-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("receipts")
      .upload(path, avatar, { upsert: true, contentType: avatar.type });
    if (!error) {
      const { data } = supabase.storage.from("receipts").getPublicUrl(path);
      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);
    }
  }
  revalidatePath("/c", "layout");
  revalidatePath("/c/perfil");
}

// ===== Ofertas (las publica el operador) =====

export async function createOffer(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  const id = str(formData.get("id"));
  const values = {
    title: str(formData.get("title")) ?? "Oferta",
    description: str(formData.get("description")),
    kind: str(formData.get("kind")),
    emoji: str(formData.get("emoji")),
    starts_at: str(formData.get("starts_at")),
    ends_at: str(formData.get("ends_at")),
  };
  let offerId = id;
  if (id) {
    // Editar una promoción existente (sin tocar 'active' ni la imagen si no
    // se sube una nueva).
    await supabase
      .from("offers")
      .update(values)
      .eq("id", id)
      .eq("operator_id", ctx.tenantId);
  } else {
    const { data: inserted } = await supabase
      .from("offers")
      .insert({
        operator_id: ctx.tenantId,
        ...values,
        active: true,
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    offerId = (inserted as { id?: string } | null)?.id ?? null;
  }
  // Efecto automático (aparte y tolerante — columnas de la 0053). Si el operador
  // no marca "aplicar automático", queda en false (sin efecto en el precio).
  if (offerId) {
    const autoApply = str(formData.get("auto_apply")) === "1";
    const dkind = str(formData.get("discount_kind"));
    const promoPatch: Record<string, unknown> = {
      auto_apply: autoApply,
      new_clients_only: str(formData.get("new_clients_only")) !== "0",
      discount_kind: autoApply ? dkind : null,
      discount_value:
        autoApply && dkind !== "comision_cero" ? num(formData.get("discount_value")) : 0,
      min_amount_usd: num(formData.get("min_amount_usd")),
    };
    await supabase
      .from("offers")
      .update(promoPatch)
      .eq("id", offerId)
      .eq("operator_id", ctx.tenantId);
  }
  if (offerId) await uploadOfferImage(supabase, formData, offerId);
  await logActivity(id ? "oferta.editar" : "oferta.crear", {
    entityType: "oferta",
    entityLabel: values.title,
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
  if (!(await validUpload(file))) return;
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

// Marcar una promoción como principal (una sola destacada por negocio).
export async function toggleOfferFeatured(id: string, featured: boolean) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  if (featured) {
    await supabase
      .from("offers")
      .update({ featured: false })
      .eq("operator_id", ctx.tenantId);
  }
  await supabase
    .from("offers")
    .update({ featured })
    .eq("id", id)
    .eq("operator_id", ctx.tenantId);
  revalidatePath("/ofertas");
  revalidatePath("/c");
}

// El cliente registra una vista de la promoción (tolerante — RPC 0025).
export async function recordOfferView(offerId: string) {
  const supabase = await createClient();
  await supabase.rpc("bump_offer_view", { p_offer: offerId });
}

// ===== Paquetes de remesa (los publica el operador) =====

export async function createPackage(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  const amount = num(formData.get("amount_usd"));
  if (amount <= 0) return; // un paquete sin monto no tiene sentido
  const { data: inserted } = await supabase
    .from("remittance_packages")
    .insert({
      operator_id: ctx.tenantId,
      title: str(formData.get("title")) ?? "Paquete",
      description: str(formData.get("description")),
      emoji: str(formData.get("emoji")),
      amount_usd: amount,
      delivery_currency: str(formData.get("delivery_currency")),
      highlight: str(formData.get("highlight")),
      active: true,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  // Precio fijo (0054, aparte y tolerante). Solo si el operador eligió el modo
  // "fijo": guarda lo que se envía en USD y lo que llega a la familia. En modo
  // "auto" se limpian esos campos (vuelve a cobrar comisión normal).
  const pkgId = (inserted as { id?: string } | null)?.id ?? null;
  if (pkgId) {
    const fixed = str(formData.get("pricing_mode")) === "fixed";
    await supabase
      .from("remittance_packages")
      .update({
        pricing_mode: fixed ? "fixed" : "auto",
        fixed_send_usd: fixed ? num(formData.get("fixed_send_usd")) : null,
        fixed_receives: fixed ? num(formData.get("fixed_receives")) : null,
      })
      .eq("id", pkgId)
      .eq("operator_id", ctx.tenantId);
    await uploadPackageImage(supabase, formData, pkgId);
  }
  await logActivity("paquete.crear", {
    entityType: "paquete",
    entityLabel: str(formData.get("title")) ?? "Paquete",
  });
  revalidatePath("/paquetes");
  revalidatePath("/c/tienda");
  revalidatePath("/c");
}

export async function updatePackage(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  const id = str(formData.get("id"));
  if (!id) return;
  const amount = num(formData.get("amount_usd"));
  if (amount <= 0) return;
  const fixed = str(formData.get("pricing_mode")) === "fixed";
  await supabase
    .from("remittance_packages")
    .update({
      title: str(formData.get("title")) ?? "Paquete",
      description: str(formData.get("description")),
      emoji: str(formData.get("emoji")),
      amount_usd: amount,
      delivery_currency: str(formData.get("delivery_currency")),
      highlight: str(formData.get("highlight")),
      pricing_mode: fixed ? "fixed" : "auto",
      fixed_send_usd: fixed ? num(formData.get("fixed_send_usd")) : null,
      fixed_receives: fixed ? num(formData.get("fixed_receives")) : null,
    })
    .eq("id", id)
    .eq("operator_id", ctx.tenantId);
  await uploadPackageImage(supabase, formData, id);
  await logActivity("paquete.editar", {
    entityType: "paquete",
    entityLabel: str(formData.get("title")) ?? "Paquete",
  });
  revalidatePath("/paquetes");
  revalidatePath("/c/tienda");
  revalidatePath("/c");
}

// Sube la foto del paquete (si hay) al bucket público "receipts" (ruta
// packages/…) y guarda la URL. Tolerante: si no hay archivo o la columna aún
// no existe (migración 0055), no hace nada.
async function uploadPackageImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  packageId: string
) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return;
  if (!(await validUpload(file))) return;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `packages/${packageId}/img-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return;
  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  await supabase
    .from("remittance_packages")
    .update({ image_url: data.publicUrl })
    .eq("id", packageId);
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

  // Si el pedido viene de un paquete, el MONTO (precio) sale del paquete real y
  // el cliente no lo fija (el trigger de la base lo blinda). La MONEDA de
  // entrega sí la elige el cliente (0057): si mandó una válida se respeta; si
  // no, cae a la del paquete.
  const VALID_CURRENCIES = ["CUP", "USD", "MLC", "EUR"];
  const packageId = str(formData.get("package_id"));
  let amount = num(formData.get("amount_usd"));
  const formCurrency = str(formData.get("delivery_currency"));
  let currency = formCurrency;
  let note = str(formData.get("note"));
  if (packageId) {
    const { data: pkgRow } = await supabase
      .from("remittance_packages")
      .select("title, amount_usd, delivery_currency, highlight, active, pricing_mode")
      .eq("id", packageId)
      .eq("operator_id", ctx.tenantId)
      .maybeSingle();
    const pkg = pkgRow as {
      title?: string;
      amount_usd?: number;
      delivery_currency?: string | null;
      highlight?: string | null;
      active?: boolean;
      pricing_mode?: string | null;
    } | null;
    if (!pkg || pkg.active === false) return;
    amount = Number(pkg.amount_usd) || 0;
    // Precio fijo: la moneda del paquete manda (su número está cerrado). En
    // automático, el cliente puede elegir la moneda de entrega.
    const chosen =
      formCurrency && VALID_CURRENCIES.includes(formCurrency) ? formCurrency : null;
    currency =
      pkg.pricing_mode === "fixed"
        ? pkg.delivery_currency ?? chosen
        : chosen ?? pkg.delivery_currency ?? formCurrency;
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

  // Forma de entrega (0056): solo aplica a CUP. La transferencia es la única
  // que hay que guardar (efectivo es el valor por defecto). Se mete en el INSERT
  // porque el cliente no puede hacer UPDATE de su pedido (RLS solo permite crear).
  const rawMethod = str(formData.get("delivery_method"));
  const method =
    currency === "CUP" && rawMethod === "transferencia" ? "transferencia" : null;

  const row: Record<string, unknown> = {
    operator_id: ctx.tenantId,
    client_id: ctx.userId,
    client_name: p.full_name ?? null,
    client_phone: p.phone ?? null,
    amount_usd: amount,
    beneficiary_name: benefName,
    beneficiary_phone: str(formData.get("beneficiary_phone")),
    province: str(formData.get("province")),
    beneficiary_address: str(formData.get("beneficiary_address")) || null,
    delivery_currency: currency,
    note,
    package_id: packageId,
    redeem: formData.get("redeem") != null,
    status: "pendiente",
  };
  if (method) row.delivery_method = method;
  const ins = await supabase.from("orders").insert(row);
  // Si faltan columnas recientes (0056 forma, 0069 dirección), reintenta sin ellas.
  if (ins.error) {
    delete row.delivery_method;
    delete row.beneficiary_address;
    await supabase.from("orders").insert(row);
  }

  // Aviso al negocio de que llegó un pedido.
  await notify([ctx.tenantId], {
    type: "pedido_nuevo",
    title: "Nuevo pedido 📦",
    body: `${p.full_name || "Un cliente"} pidió $${amount} para ${benefName}.`,
    url: "/pedidos",
    operatorId: ctx.tenantId,
  });

  revalidatePath("/c");
  revalidatePath("/c/pedidos");
  redirect("/c/pedidos");
}

// Crea VARIOS pedidos de una vez (uno por beneficiario), compartiendo moneda,
// forma de entrega y nota. No usa paquetes ni puntos (envío manual a varios).
// El campo "recipients" viene como JSON: [{name, phone, province, amount}].
export async function createOrdersMulti(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (ctx.role !== "cliente" || !ctx.tenantId || !ctx.userId) return;

  let recipients: {
    name?: string;
    phone?: string;
    province?: string;
    address?: string;
    amount?: number | string;
  }[] = [];
  try {
    const raw = str(formData.get("recipients"));
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) recipients = parsed;
  } catch {
    return;
  }

  const currency = str(formData.get("delivery_currency"));
  const rawMethod = str(formData.get("delivery_method"));
  const method =
    currency === "CUP" && rawMethod === "transferencia" ? "transferencia" : null;
  const note = str(formData.get("note"));

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", ctx.userId)
    .single();
  const p = (prof ?? {}) as { full_name?: string | null; phone?: string | null };

  // Normaliza y valida cada beneficiario (nombre + monto positivo).
  const rows: Record<string, unknown>[] = [];
  for (const r of recipients) {
    const name = (r.name ?? "").toString().trim();
    const amount = Number(r.amount) || 0;
    if (!name || amount <= 0) continue;
    const row: Record<string, unknown> = {
      operator_id: ctx.tenantId,
      client_id: ctx.userId,
      client_name: p.full_name ?? null,
      client_phone: p.phone ?? null,
      amount_usd: amount,
      beneficiary_name: name,
      beneficiary_phone: (r.phone ?? "").toString().trim() || null,
      province: (r.province ?? "").toString().trim() || null,
      beneficiary_address: (r.address ?? "").toString().trim() || null,
      delivery_currency: currency,
      note,
      status: "pendiente",
    };
    if (method) row.delivery_method = method;
    rows.push(row);
  }
  if (rows.length === 0) return;

  const ins = await supabase.from("orders").insert(rows);
  // Si faltan columnas recientes (0056 forma, 0069 dirección), reintenta sin ellas.
  if (ins.error) {
    await supabase.from("orders").insert(
      rows.map(({ delivery_method: _m, beneficiary_address: _a, ...rest }) => rest)
    );
  }

  revalidatePath("/c");
  revalidatePath("/c/pedidos");
  redirect("/c/pedidos");
}

// ===== Libreta de beneficiarios del cliente, en la nube (0059) =====
// Server actions que el componente cliente invoca para leer/escribir. Todas
// tolerantes: si la tabla aún no existe, se comportan como vacío / no-op.

type SavedBenef = {
  id: string;
  apodo: string;
  name: string;
  phone: string | null;
  province: string | null;
  favorite: boolean;
  note: string | null;
  address: string | null;
};

// Columnas a leer. La nota (0063) y la dirección (0069) pueden no existir aún;
// se reintenta con menos columnas para no romper la libreta.
const SAVED_COLS_FULL = "id, apodo, name, phone, province, favorite, note, address";
const SAVED_COLS_NOTE = "id, apodo, name, phone, province, favorite, note";
const SAVED_COLS_BASE = "id, apodo, name, phone, province, favorite";

export async function listSavedBeneficiaries(): Promise<SavedBenef[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return [];
  const run = (cols: string) =>
    supabase
      .from("client_saved_beneficiaries")
      .select(cols)
      .eq("user_id", ctx.userId as string)
      .order("favorite", { ascending: false })
      .order("created_at", { ascending: false });
  let { data, error } = await run(SAVED_COLS_FULL);
  if (error) ({ data, error } = await run(SAVED_COLS_NOTE));
  if (error) ({ data, error } = await run(SAVED_COLS_BASE));
  if (error) return [];
  return ((data as unknown as SavedBenef[]) ?? []).map((b) => ({
    ...b,
    note: b.note ?? null,
    address: b.address ?? null,
  }));
}

export async function addSavedBeneficiary(input: {
  apodo: string;
  name: string;
  phone?: string | null;
  province?: string | null;
  address?: string | null;
}): Promise<SavedBenef | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return null;
  const name = (input.name || "").trim();
  const apodo = (input.apodo || "").trim() || name;
  if (!name) return null;
  const phone = (input.phone || "").trim() || null;
  const province = (input.province || "").trim() || null;
  const address = (input.address || "").trim() || null;
  const norm = (row: SavedBenef | null) =>
    row ? { ...row, note: row.note ?? null, address: row.address ?? null } : null;
  // Evita duplicados: si ya existe ese (nombre + teléfono), actualiza sus datos.
  let dupQ = supabase
    .from("client_saved_beneficiaries")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("name", name);
  dupQ = phone === null ? dupQ.is("phone", null) : dupQ.eq("phone", phone);
  const { data: existing } = await dupQ.maybeSingle();
  const dupId = (existing as { id?: string } | null)?.id;
  if (dupId) {
    const patch: Record<string, unknown> = { apodo, province, address };
    let res = await supabase
      .from("client_saved_beneficiaries")
      .update(patch)
      .eq("id", dupId)
      .eq("user_id", ctx.userId)
      .select(SAVED_COLS_BASE)
      .maybeSingle();
    if (res.error) {
      delete patch.address;
      res = await supabase
        .from("client_saved_beneficiaries")
        .update(patch)
        .eq("id", dupId)
        .eq("user_id", ctx.userId)
        .select(SAVED_COLS_BASE)
        .maybeSingle();
    }
    return norm(res.data as unknown as SavedBenef | null);
  }
  const base = { user_id: ctx.userId, apodo, name, phone, province };
  let res = await supabase
    .from("client_saved_beneficiaries")
    .insert({ ...base, address })
    .select(SAVED_COLS_BASE)
    .maybeSingle();
  // Si la columna address (0069) no existe, reintenta sin ella.
  if (res.error) {
    res = await supabase
      .from("client_saved_beneficiaries")
      .insert(base)
      .select(SAVED_COLS_BASE)
      .maybeSingle();
  }
  if (res.error) return null;
  return norm(res.data as unknown as SavedBenef | null);
}

// Guarda (o limpia) la dirección de un beneficiario. Tolerante (0069).
export async function saveSavedBeneficiaryAddress(
  id: string,
  address: string
): Promise<void> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId || !id) return;
  await supabase
    .from("client_saved_beneficiaries")
    .update({ address: address.trim() || null })
    .eq("id", id)
    .eq("user_id", ctx.userId);
}

// Guarda (o limpia) la nota de un beneficiario. Tolerante: si la columna aún
// no existe (migración 0063 sin aplicar), no hace nada.
export async function saveSavedBeneficiaryNote(
  id: string,
  note: string
): Promise<void> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId || !id) return;
  const value = note.trim() || null;
  await supabase
    .from("client_saved_beneficiaries")
    .update({ note: value })
    .eq("id", id)
    .eq("user_id", ctx.userId);
}

export async function renameSavedBeneficiary(
  id: string,
  apodo: string
): Promise<void> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId || !id || !apodo.trim()) return;
  await supabase
    .from("client_saved_beneficiaries")
    .update({ apodo: apodo.trim() })
    .eq("id", id)
    .eq("user_id", ctx.userId);
}

export async function toggleFavoriteSavedBeneficiary(
  id: string,
  favorite: boolean
): Promise<void> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId || !id) return;
  await supabase
    .from("client_saved_beneficiaries")
    .update({ favorite })
    .eq("id", id)
    .eq("user_id", ctx.userId);
}

export async function deleteSavedBeneficiary(id: string): Promise<void> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId || !id) return;
  await supabase
    .from("client_saved_beneficiaries")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.userId);
}

// ===== Ubicación en vivo del reparto (migración 0068) =====
export type DeliveryLocation = {
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
};

// El repartidor (personal) actualiza su posición para una remesa.
export async function updateDeliveryLocation(
  remittanceId: string,
  lat: number,
  lng: number,
  accuracy?: number | null
): Promise<void> {
  if (!remittanceId || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const supabase = await createClient();
  await supabase.rpc("update_delivery_location", {
    p_remittance: remittanceId,
    p_lat: lat,
    p_lng: lng,
    p_accuracy: accuracy ?? null,
  });
}

// El cliente (o el personal) lee la última posición del repartidor.
export async function getDeliveryLocation(
  remittanceId: string
): Promise<DeliveryLocation | null> {
  if (!remittanceId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_delivery_location", {
    p_remittance: remittanceId,
  });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as DeliveryLocation | null;
  return row ?? null;
}

// ===== Chat por pedido (cliente ↔ negocio), migración 0067 =====
export type OrderMessage = {
  id: string;
  sender: "cliente" | "negocio";
  body: string;
  created_at: string;
};

export async function listOrderMessages(
  orderId: string
): Promise<OrderMessage[]> {
  if (!orderId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_order_messages", {
    p_order: orderId,
  });
  if (error) return [];
  return (data as OrderMessage[]) ?? [];
}

export async function sendOrderMessage(
  orderId: string,
  body: string
): Promise<void> {
  const text = (body || "").trim();
  if (!orderId || !text) return;
  const supabase = await createClient();
  await supabase.rpc("send_order_message", { p_order: orderId, p_body: text });

  // Aviso al otro lado del chat.
  try {
    const ctx = await getSessionContext();
    const { data } = await supabase
      .from("orders")
      .select("client_id, operator_id, accepted_by")
      .eq("id", orderId)
      .maybeSingle();
    const o = data as {
      client_id?: string | null;
      operator_id?: string | null;
      accepted_by?: string | null;
    } | null;
    if (o) {
      const fromCliente = ctx.role === "cliente";
      const recipients = fromCliente
        ? [o.operator_id, o.accepted_by]
        : [o.client_id];
      await notify(recipients, {
        type: "chat",
        title: fromCliente ? "Mensaje de un cliente 💬" : "Mensaje del negocio 💬",
        body: text.slice(0, 120),
        url: fromCliente ? "/pedidos" : `/c/pedidos/${orderId}`,
        operatorId: o.operator_id ?? null,
      });
    }
  } catch {
    /* nada */
  }
}

// Marca el chat de un pedido como leído por el usuario actual.
export async function markOrderMessagesRead(orderId: string): Promise<void> {
  if (!orderId) return;
  const supabase = await createClient();
  await supabase.rpc("mark_order_messages_read", { p_order: orderId });
}

// Mensajes no leídos por pedido para el usuario actual (mapa order_id -> conteo).
export async function getUnreadOrderCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("order_unread_counts");
  if (error) return {};
  const out: Record<string, number> = {};
  for (const row of (data as { order_id: string; unread: number }[]) ?? []) {
    out[row.order_id] = Number(row.unread) || 0;
  }
  return out;
}

// Exporta todos los datos personales del cliente en un objeto (para descargar
// como JSON). Solo lee lo que la RLS permite: sus propios registros.
export async function exportMyData(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const [profile, orders, points, benef, reviews, alerts, reminders] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("orders").select("*").eq("client_id", user.id),
      supabase.from("points_ledger").select("*").eq("client_id", user.id),
      supabase
        .from("client_saved_beneficiaries")
        .select("*")
        .eq("user_id", user.id),
      supabase.from("reviews").select("*").eq("client_id", user.id),
      supabase.from("client_rate_alerts").select("*").eq("user_id", user.id),
      supabase.from("client_send_reminders").select("*").eq("user_id", user.id),
    ]);
  return {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile.data ?? null,
    orders: orders.data ?? [],
    points: points.data ?? [],
    saved_beneficiaries: benef.data ?? [],
    reviews: reviews.data ?? [],
    rate_alerts: alerts.data ?? [],
    send_reminders: reminders.data ?? [],
  };
}

// Elimina la cuenta del cliente: borra datos personales y anonimiza pedidos
// (función 0066), cierra la sesión y redirige al login.
export async function deleteMyAccount(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("delete_my_account");
  await supabase.auth.signOut();
  redirect("/login");
}

// El cliente informa en la app que ya pagó su pedido (queda registrado con
// marca de tiempo). El cobro lo confirma luego el negocio. Tolerante: si la
// función aún no existe (migración 0065), no rompe.
export async function clientMarkOrderPaid(orderId: string): Promise<void> {
  if (!orderId) return;
  const supabase = await createClient();
  await supabase.rpc("client_mark_order_paid", { p_order: orderId });
  await notifyPaymentInformed(supabase, orderId, false);
  revalidatePath(`/c/pedidos/${orderId}`);
}

// Avisa al operador que el cliente informó su pago (con o sin comprobante).
async function notifyPaymentInformed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  withProof: boolean
): Promise<void> {
  const { data } = await supabase
    .from("orders")
    .select("operator_id, client_name, amount_usd")
    .eq("id", orderId)
    .maybeSingle();
  const o = data as {
    operator_id?: string;
    client_name?: string;
    amount_usd?: number;
  } | null;
  if (o?.operator_id) {
    await notify([o.operator_id], {
      type: "pago_informado",
      title: "Pago informado 💳",
      body: `${o.client_name || "Un cliente"} dice que pagó $${o.amount_usd}${
        withProof ? " · con comprobante" : ""
      }.`,
      url: "/pedidos",
      operatorId: o.operator_id,
    });
  }
}

// El cliente sube la captura de su pago al pedido. Guarda la imagen en el bucket
// "receipts" (ruta payments/…) y la asocia al pedido vía RPC (marca "ya pagué").
// Devuelve la URL para reflejarla al instante. Tolerante: si algo falla,
// devuelve null.
export async function clientUploadPaymentProof(
  orderId: string,
  formData: FormData
): Promise<string | null> {
  if (!orderId) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!(await validUpload(file, { allowPdf: true }))) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `payments/${orderId}/proof-${Date.now()}.${ext}`;
  const up = await supabase.storage
    .from("docs")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) return null;
  // Guardamos la RUTA del bucket privado (no una URL pública). Se firma al leer.
  const { error } = await supabase.rpc("client_set_payment_proof", {
    p_order: orderId,
    p_url: path,
  });
  if (error) return null;
  await notifyPaymentInformed(supabase, orderId, true);
  revalidatePath(`/c/pedidos/${orderId}`);
  revalidatePath("/pedidos");
  // Devolvemos una URL firmada temporal para reflejarla al instante en el cliente.
  return signDoc(path);
}

// ===== Centro de notificaciones (in-app) =====

// Marca todas las notificaciones del usuario como leídas.
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);
}

// ===== Notificaciones push (FCM) =====

// Guarda el token del dispositivo del usuario para enviarle avisos al teléfono.
export async function savePushToken(
  token: string,
  platform = "android"
): Promise<void> {
  if (!token) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("push_tokens").upsert(
    {
      user_id: user.id,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" }
  );
}

export async function deletePushToken(token: string): Promise<void> {
  if (!token) return;
  const supabase = await createClient();
  await supabase.from("push_tokens").delete().eq("token", token);
}

// ===== Vaquita familiar =====

// El cliente organizador crea una vaquita para un beneficiario. Genera el token
// del enlace público y redirige al detalle.
export async function createVaquita(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (ctx.role !== "cliente" || !ctx.tenantId || !ctx.userId) return;
  const beneficiary = str(formData.get("beneficiary_name"));
  if (!beneficiary) return;
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const currency = str(formData.get("delivery_currency")) || "CUP";
  const row = {
    operator_id: ctx.tenantId,
    organizer_client_id: ctx.userId,
    title: str(formData.get("title")) || null,
    beneficiary_name: beneficiary,
    beneficiary_phone: str(formData.get("beneficiary_phone")) || null,
    province: str(formData.get("province")) || null,
    beneficiary_address: str(formData.get("beneficiary_address")) || null,
    delivery_currency: currency,
    goal_usd: num(formData.get("goal_usd")) || 0,
    deadline: str(formData.get("deadline")) || null,
    share_token: token,
    status: "abierta",
  };
  const { data, error } = await supabase
    .from("vaquitas")
    .insert(row)
    .select("id")
    .single();
  if (error) return;
  const id = (data as { id?: string } | null)?.id;
  revalidatePath("/c/vaquita");
  if (id) redirect(`/c/vaquita/${id}`);
}

// Aporte por el enlace público (sin cuenta). Sube el comprobante (opcional) y
// registra el aporte vía RPC. Devuelve ok.
export async function contributeVaquita(
  token: string,
  formData: FormData
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const name = str(formData.get("name"));
  const amount = num(formData.get("amount"));
  if (!token || !name || !(amount > 0)) return { ok: false };

  // El comprobante es OBLIGATORIO.
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) return { ok: false };
  if (!(await validUpload(file, { allowPdf: true }))) return { ok: false };
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `vaquitas/${token}/c-${Date.now()}.${ext}`;
  const up = await supabase.storage
    .from("docs")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) return { ok: false };
  // Guardamos la RUTA del bucket privado (no una URL pública). Se firma al leer.
  const { data, error } = await supabase.rpc("vaquita_contribute", {
    p_token: token,
    p_name: name,
    p_amount: amount,
    p_proof: path,
  });
  if (error || !data) return { ok: false };
  // Aviso al organizador y al operador (push).
  await notifyVaquitaContribution(token, name, amount);
  revalidatePath(`/v/${token}`);
  return { ok: true };
}

// El personal confirma que recibió un aporte.
export async function confirmVaquitaContribution(id: string): Promise<void> {
  if (!id) return;
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx)) return;
  await supabase
    .from("vaquita_contributions")
    .update({ status: "confirmado" })
    .eq("id", id);
  // Aviso al organizador de que su aporte fue confirmado.
  const { data: c } = await supabase
    .from("vaquita_contributions")
    .select("contributor_name, amount_usd, vaquita_id")
    .eq("id", id)
    .maybeSingle();
  const cc = c as {
    contributor_name?: string;
    amount_usd?: number;
    vaquita_id?: string;
  } | null;
  if (cc?.vaquita_id) {
    const { data: v } = await supabase
      .from("vaquitas")
      .select("id, organizer_client_id")
      .eq("id", cc.vaquita_id)
      .maybeSingle();
    const vv = v as { id: string; organizer_client_id?: string } | null;
    if (vv?.organizer_client_id) {
      await notify([vv.organizer_client_id], {
        type: "vaquita_confirmado",
        title: "Aporte confirmado ✅",
        body: `El negocio confirmó el aporte de ${cc.contributor_name} ($${cc.amount_usd}).`,
        url: `/c/vaquita/${vv.id}`,
      });
    }
  }
  revalidatePath("/vaquitas");
}

// El organizador convierte la vaquita en UN pedido por el total aportado.
export async function convertVaquitaToOrder(vaquitaId: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId || !ctx.tenantId) return;

  const { data: vRow } = await supabase
    .from("vaquitas")
    .select("*")
    .eq("id", vaquitaId)
    .maybeSingle();
  const v = vRow as {
    organizer_client_id?: string;
    status?: string;
    beneficiary_name?: string;
    beneficiary_phone?: string | null;
    province?: string | null;
    beneficiary_address?: string | null;
    delivery_currency?: string;
    title?: string | null;
  } | null;
  if (!v || v.organizer_client_id !== ctx.userId || v.status !== "abierta")
    return;

  const { data: cRows } = await supabase
    .from("vaquita_contributions")
    .select("amount_usd, status")
    .eq("vaquita_id", vaquitaId);
  const rows = (cRows as { amount_usd: number; status: string }[]) ?? [];
  // Debe haber aportes y TODOS confirmados por el negocio.
  if (rows.length === 0) return;
  if (rows.some((x) => x.status !== "confirmado")) return;
  const total = rows.reduce((s, x) => s + Number(x.amount_usd), 0);
  if (total <= 0) return;

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", ctx.userId)
    .single();
  const p = (prof ?? {}) as { full_name?: string | null; phone?: string | null };

  const orderRow: Record<string, unknown> = {
    operator_id: ctx.tenantId,
    client_id: ctx.userId,
    client_name: p.full_name ?? null,
    client_phone: p.phone ?? null,
    amount_usd: total,
    beneficiary_name: v.beneficiary_name,
    beneficiary_phone: v.beneficiary_phone ?? null,
    province: v.province ?? null,
    beneficiary_address: v.beneficiary_address ?? null,
    delivery_currency: v.delivery_currency ?? "CUP",
    note: `Vaquita familiar${v.title ? `: ${v.title}` : ""}`,
    status: "pendiente",
  };
  const ins = await supabase.from("orders").insert(orderRow).select("id").single();
  let orderId: string | null = (ins.data as { id?: string } | null)?.id ?? null;
  if (ins.error) {
    delete orderRow.beneficiary_address;
    const retry = await supabase
      .from("orders")
      .insert(orderRow)
      .select("id")
      .single();
    orderId = (retry.data as { id?: string } | null)?.id ?? null;
  }

  await supabase
    .from("vaquitas")
    .update({ status: "enviada", order_id: orderId })
    .eq("id", vaquitaId)
    .eq("organizer_client_id", ctx.userId);

  revalidatePath(`/c/vaquita/${vaquitaId}`);
  revalidatePath("/c/pedidos");
  if (orderId) redirect(`/c/pedidos/${orderId}`);
}

// El organizador borra su propia vaquita (mientras no se haya convertido en
// pedido). Los aportes se borran en cascada. RLS lo refuerza (política 0081).
export async function deleteVaquita(vaquitaId: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (ctx.role !== "cliente" || !ctx.userId) return;

  const { data: vRow } = await supabase
    .from("vaquitas")
    .select("organizer_client_id, order_id")
    .eq("id", vaquitaId)
    .maybeSingle();
  const v = vRow as {
    organizer_client_id?: string;
    order_id?: string | null;
  } | null;
  // Solo el organizador, y solo si aún no se convirtió en pedido.
  if (!v || v.organizer_client_id !== ctx.userId || v.order_id) return;

  await supabase.from("vaquitas").delete().eq("id", vaquitaId);
  revalidatePath("/c/vaquita");
  redirect("/c/vaquita");
}

export type ReferralFriend = {
  name: string;
  status: "premiado" | "activo" | "registrado";
  joined_at: string;
};

// Lista de amigos referidos por el usuario y su estado. Tolerante: si la
// función my_referrals() aún no existe (migración 0064), devuelve vacío.
export async function listMyReferrals(): Promise<ReferralFriend[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_referrals");
  if (error) return [];
  return ((data as ReferralFriend[]) ?? []).map((r) => ({
    name: r.name,
    status: r.status,
    joined_at: r.joined_at,
  }));
}

// ===== Alertas de tasa del cliente (0060) =====

type RateAlert = { id: string; currency: string; target_rate: number };

export async function listRateAlerts(): Promise<RateAlert[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return [];
  const { data, error } = await supabase
    .from("client_rate_alerts")
    .select("id, currency, target_rate")
    .eq("user_id", ctx.userId);
  if (error) return [];
  return (data as RateAlert[]) ?? [];
}

export async function setRateAlert(
  currency: string,
  target: number
): Promise<RateAlert | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId || !currency || !(target > 0)) return null;
  // Un objetivo por moneda: upsert por (user_id, currency).
  const { data, error } = await supabase
    .from("client_rate_alerts")
    .upsert(
      { user_id: ctx.userId, currency, target_rate: target },
      { onConflict: "user_id,currency" }
    )
    .select("id, currency, target_rate")
    .maybeSingle();
  if (error) return null;
  return (data as RateAlert) ?? null;
}

export async function deleteRateAlert(id: string): Promise<void> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId || !id) return;
  await supabase
    .from("client_rate_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.userId);
}

// ===== Recordatorios de envío del cliente (0061) =====

type SendReminder = {
  id: string;
  label: string;
  name: string | null;
  phone: string | null;
  province: string | null;
  amount_usd: number;
  currency: string;
  interval_days: number;
  next_at: string;
};

function addDaysISO(from: string, days: number): string {
  const base = from ? new Date(from + "T00:00:00") : new Date();
  const t = Number.isNaN(base.getTime()) ? new Date() : base;
  t.setDate(t.getDate() + days);
  return t.toISOString().slice(0, 10);
}

export async function listReminders(): Promise<SendReminder[]> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return [];
  const { data, error } = await supabase
    .from("client_send_reminders")
    .select("id, label, name, phone, province, amount_usd, currency, interval_days, next_at")
    .eq("user_id", ctx.userId)
    .order("next_at", { ascending: true });
  if (error) return [];
  return (data as SendReminder[]) ?? [];
}

export async function addReminder(input: {
  label: string;
  name?: string | null;
  phone?: string | null;
  province?: string | null;
  amount_usd: number;
  currency: string;
  interval_days: number;
}): Promise<SendReminder | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return null;
  const label = (input.label || "").trim();
  if (!label || !(input.amount_usd > 0)) return null;
  const interval = Math.max(1, Math.round(input.interval_days) || 30);
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("client_send_reminders")
    .insert({
      user_id: ctx.userId,
      label,
      name: (input.name || "").trim() || label,
      phone: (input.phone || "").trim() || null,
      province: (input.province || "").trim() || null,
      amount_usd: input.amount_usd,
      currency: input.currency || "CUP",
      interval_days: interval,
      next_at: addDaysISO(today, interval),
    })
    .select("id, label, name, phone, province, amount_usd, currency, interval_days, next_at")
    .maybeSingle();
  if (error) return null;
  return (data as SendReminder) ?? null;
}

// Pospone: mueve next_at un intervalo más allá (desde hoy si ya venció).
export async function snoozeReminder(id: string): Promise<string | null> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId || !id) return null;
  const { data: cur } = await supabase
    .from("client_send_reminders")
    .select("interval_days, next_at")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  const row = cur as { interval_days?: number; next_at?: string } | null;
  if (!row) return null;
  const today = new Date().toISOString().slice(0, 10);
  const from = (row.next_at ?? today) < today ? today : row.next_at ?? today;
  const next = addDaysISO(from, Math.max(1, Number(row.interval_days) || 30));
  await supabase
    .from("client_send_reminders")
    .update({ next_at: next })
    .eq("id", id)
    .eq("user_id", ctx.userId);
  return next;
}

export async function deleteReminder(id: string): Promise<void> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId || !id) return;
  await supabase
    .from("client_send_reminders")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.userId);
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
  const { data: o } = await supabase
    .from("orders")
    .select("operator_id, client_name, amount_usd, beneficiary_name")
    .eq("id", id)
    .eq("status", "pendiente")
    .maybeSingle();
  await supabase.from("orders").delete().eq("id", id).eq("status", "pendiente");
  const ord = o as {
    operator_id?: string;
    client_name?: string;
    amount_usd?: number;
    beneficiary_name?: string;
  } | null;
  if (ord?.operator_id) {
    await notify([ord.operator_id], {
      type: "pedido_cancelado",
      title: "Pedido cancelado",
      body: `${ord.client_name || "Un cliente"} canceló su pedido de $${ord.amount_usd}.`,
      url: "/pedidos",
      operatorId: ord.operator_id,
    });
  }
  revalidatePath("/c");
  revalidatePath("/c/pedidos");
}

// El personal rechaza un pedido.
export async function rejectOrder(id: string, reason?: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx)) return;
  await supabase
    .from("orders")
    .update({ status: "rechazado", accepted_by: ctx.userId })
    .eq("id", id)
    .eq("status", "pendiente");
  // Motivo opcional para el cliente (tolerante si la columna no existe — 0024).
  const clean = reason?.trim();
  if (clean) {
    await supabase.from("orders").update({ reject_reason: clean }).eq("id", id);
  }
  // Aviso al cliente del rechazo.
  const { data: ro } = await supabase
    .from("orders")
    .select("client_id, beneficiary_name")
    .eq("id", id)
    .maybeSingle();
  const rr = ro as { client_id?: string; beneficiary_name?: string } | null;
  if (rr?.client_id) {
    await notify([rr.client_id], {
      type: "pedido_rechazado",
      title: "Pedido rechazado",
      body: clean
        ? `Motivo: ${clean}`
        : `Tu envío para ${rr.beneficiary_name || "tu familia"} no se pudo procesar.`,
      url: `/c/pedidos/${id}`,
      operatorId: ctx.tenantId,
    });
  }
  await logActivity("pedido.rechazar", { entityType: "pedido", entityId: id });
  revalidatePath("/pedidos");
  revalidatePath("/c");
}

// Deshacer un rechazo: devuelve el pedido a pendiente.
export async function restoreOrderToPending(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx)) return;
  await supabase
    .from("orders")
    .update({ status: "pendiente", accepted_by: null })
    .eq("id", id)
    .eq("status", "rechazado");
  // Limpia el motivo (tolerante si la columna no existe — 0024).
  await supabase.from("orders").update({ reject_reason: null }).eq("id", id);
  await logActivity("pedido.restaurar", { entityType: "pedido", entityId: id });
  revalidatePath("/pedidos");
  revalidatePath("/c");
}

// El personal acepta un pedido → se convierte en remesa (cliente + beneficiario
// + remesa pendiente por cobrar). Si acepta un repartidor, queda asignada a él.
export async function acceptOrder(
  id: string,
  opts?: { delivererId?: string | null; note?: string }
) {
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
    beneficiary_address?: string | null;
    delivery_currency?: string | null;
    delivery_method?: string | null;
    note?: string | null;
    redeem?: boolean | null;
    package_id?: string | null;
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

  // Tasa del negocio para esa moneda. USD se entrega 1:1 (sin conversión). Para
  // el resto, sin tasa no se puede convertir bien: vuelve a pendiente para que
  // configuren la tasa y reintenten.
  let rate = 1;
  if (currency !== "USD") {
    const { data: rateRow } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("operator_id", tid)
      .eq("currency", currency)
      .maybeSingle();
    rate = Number((rateRow as { rate?: number } | null)?.rate ?? 0);
    if (rate <= 0) {
      await revertToPending();
      return;
    }
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

  // Cliente de agenda enlazado a la CUENTA real del cliente (user_id), no al
  // teléfono: así dos personas distintas nunca se fusionan aunque compartan
  // número. Orden: (1) buscar por cuenta; (2) adoptar un registro viejo del
  // mismo teléfono SOLO si aún no tiene cuenta asignada (compatibilidad con
  // datos anteriores); (3) crear uno nuevo enlazado a la cuenta.
  let clientId: string | null = null;
  if (order.client_id) {
    const { data: byUser } = await supabase
      .from("clients")
      .select("id")
      .eq("operator_id", tid)
      .eq("user_id", order.client_id)
      .maybeSingle();
    clientId = (byUser as { id?: string } | null)?.id ?? null;

    if (!clientId && order.client_phone) {
      const { data: byPhone } = await supabase
        .from("clients")
        .select("id, user_id")
        .eq("operator_id", tid)
        .eq("phone", order.client_phone)
        .maybeSingle();
      const bp = byPhone as { id?: string; user_id?: string | null } | null;
      // Solo adopta si ese registro no está ya reclamado por otra cuenta.
      if (bp?.id && !bp.user_id) {
        clientId = bp.id;
        await supabase
          .from("clients")
          .update({ user_id: order.client_id })
          .eq("id", clientId);
      }
    }
  }
  if (!clientId && order.client_name) {
    const { data: c } = await supabase
      .from("clients")
      .insert({
        name: order.client_name,
        phone: order.client_phone,
        operator_id: tid,
        ...(order.client_id ? { user_id: order.client_id } : {}),
      })
      .select("id")
      .single();
    clientId = (c as { id?: string } | null)?.id ?? null;
  }

  // Beneficiario del pedido.
  let beneficiaryId: string | null = null;
  if (order.beneficiary_name) {
    const benefRow: Record<string, unknown> = {
      name: order.beneficiary_name,
      phone: order.beneficiary_phone,
      province: order.province,
      address: order.beneficiary_address ?? null,
      preferred_currency: currency,
      client_id: clientId,
      operator_id: tid,
    };
    let bRes = await supabase
      .from("beneficiaries")
      .insert(benefRow)
      .select("id")
      .single();
    // Si 'address' aún no existe en beneficiaries, reintenta sin ella.
    if (bRes.error) {
      delete benefRow.address;
      bRes = await supabase
        .from("beneficiaries")
        .insert(benefRow)
        .select("id")
        .single();
    }
    beneficiaryId = (bRes.data as { id?: string } | null)?.id ?? null;
  }

  // Comisión base. Si el cliente pidió usar puntos, la reserva se hace de forma
  // ATÓMICA en la base (redeem_points, con lock por cliente): así dos pedidos
  // simultáneos no pueden gastar el saldo dos veces. El descuento está topado a
  // un % de la comisión (la casa siempre conserva la mayor parte).
  let commission = calcCommission(amountUsd, rules);
  let promoRate = rate;
  let promoTitle: string | null = null;
  let bonusPoints = 0;

  // ¿Paquete de PRECIO FIJO (0054)? Entonces los números del paquete mandan:
  // no se cobra comisión aparte ni se recalcula por tasa. La comisión implícita
  // = lo que paga (amount_usd) − lo que se envía (fixed_send_usd), y la familia
  // recibe exactamente fixed_receives. Tolerante si la 0054 no está aplicada.
  let fixedMode = false;
  if (order.package_id) {
    const { data: pkg } = await supabase
      .from("remittance_packages")
      .select("pricing_mode, fixed_send_usd, fixed_receives")
      .eq("id", order.package_id)
      .eq("operator_id", tid)
      .maybeSingle();
    const fx = pkg as {
      pricing_mode?: string | null;
      fixed_send_usd?: number | null;
      fixed_receives?: number | null;
    } | null;
    if (
      fx?.pricing_mode === "fixed" &&
      fx.fixed_send_usd != null &&
      fx.fixed_receives != null
    ) {
      const sendUsd = Number(fx.fixed_send_usd) || 0;
      const receives = Number(fx.fixed_receives) || 0;
      if (sendUsd > 0) {
        fixedMode = true;
        commission = round2(amountUsd - sendUsd); // lo que te queda
        promoRate = round2(receives / sendUsd); // tasa implícita → local = receives
      }
    }
  }

  // Promoción automática (0053, tolerante). Candados: ventana de fechas, monto
  // mínimo y, por defecto, solo clientes nuevos (su primer envío en este
  // negocio). Se elige la promo automática más reciente que califique. La
  // comisión nunca queda negativa. Corre ANTES del canje de puntos para que el
  // tope del canje use la comisión ya rebajada (sin números negativos). No se
  // aplica a paquetes de precio fijo (esos ya traen su precio cerrado).
  if (!fixedMode) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: promos } = await supabase
      .from("offers")
      .select(
        "title, discount_kind, discount_value, min_amount_usd, new_clients_only, starts_at, ends_at"
      )
      .eq("operator_id", tid)
      .eq("active", true)
      .eq("auto_apply", true)
      .order("created_at", { ascending: false });
    const list =
      (promos as Array<{
        title: string | null;
        discount_kind: string | null;
        discount_value: number | null;
        min_amount_usd: number | null;
        new_clients_only: boolean | null;
        starts_at: string | null;
        ends_at: string | null;
      }> | null) ?? [];
    if (list.length > 0) {
      // Cliente nuevo = sin remesas previas en este negocio.
      let isNew = true;
      if (clientId) {
        const { count } = await supabase
          .from("remittances")
          .select("id", { count: "exact", head: true })
          .eq("operator_id", tid)
          .eq("client_id", clientId);
        isNew = (count ?? 0) === 0;
      }
      const promo = list.find(
        (p) =>
          !!p.discount_kind &&
          amountUsd >= (Number(p.min_amount_usd) || 0) &&
          (!p.starts_at || p.starts_at <= today) &&
          (!p.ends_at || p.ends_at >= today) &&
          (p.new_clients_only === false || isNew)
      );
      if (promo) {
        const val = Number(promo.discount_value) || 0;
        if (promo.discount_kind === "comision_cero") commission = 0;
        else if (promo.discount_kind === "comision_pct")
          commission = round2(Math.max(0, commission - (commission * val) / 100));
        else if (promo.discount_kind === "comision_flat")
          commission = round2(Math.max(0, commission - val));
        else if (promo.discount_kind === "tasa_bonus")
          promoRate = round2(rate + val);
        else if (promo.discount_kind === "combo_extra")
          // La familia recibe `val` USD extra: sale de tu margen (la comisión
          // baja en esa cantidad, incluso a negativo si el combo es mayor).
          commission = round2(commission - val);
        else if (promo.discount_kind === "bono_puntos")
          // Puntos extra al cliente: no toca el precio, se acreditan al final.
          bonusPoints = Math.max(0, Math.round(val));
        promoTitle = promo.title ?? null;
      }
    }
  }

  let pointsUsed = 0;
  let discount = 0;
  if (!fixedMode && order.redeem && order.client_id && commission > 0) {
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

  // Forma de entrega (0056): si la familia recibe CUP por TRANSFERENCIA, la
  // tasa efectiva sube el % configurado (transferencia = efectivo + bono). No
  // aplica a precio fijo (su número ya está cerrado). Lectura tolerante del %.
  let transferPct = 10;
  {
    const { data: tset } = await supabase
      .from("business_settings")
      .select("transfer_bonus_pct")
      .eq("operator_id", tid)
      .maybeSingle();
    const v = (tset as { transfer_bonus_pct?: number | null } | null)
      ?.transfer_bonus_pct;
    if (v != null) transferPct = Number(v) || 0;
  }
  const useTransfer =
    !fixedMode &&
    currency === "CUP" &&
    order.delivery_method === "transferencia";
  const effectiveRate = useTransfer
    ? round2(promoRate * transferFactor(transferPct))
    : promoRate;

  const c = computeRemittance({
    amountUsd,
    commission,
    exchangeRate: effectiveRate,
    exchangeProfit: 0,
    mySplitPercent: split,
  });

  // Repartidor asignado: si el operador eligió uno explícito, se usa ese;
  // si acepta un repartidor, queda asignada a él.
  const delivererId = ctx.isOperador
    ? opts?.delivererId || null
    : ctx.role === "repartidor"
    ? ctx.userId
    : null;

  // Nota interna del personal (no visible al cliente), junto a la del cliente.
  const internalNote = opts?.note?.trim();
  const notes =
    [
      order.note,
      internalNote ? `📝 ${internalNote}` : null,
      promoTitle ? `🎁 Promo aplicada: ${promoTitle}` : null,
    ]
      .filter(Boolean)
      .join("\n\n") || null;

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
      exchange_rate: effectiveRate,
      local_amount: c.localAmount,
      exchange_profit: 0,
      total_profit: c.totalProfit,
      my_split_percent: split,
      my_share: c.myShare,
      partner_share: c.partnerShare,
      status: "pendiente",
      notes,
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

  // Guarda la forma de entrega en la remesa (0056, tolerante). El monto ya está
  // bien en local_amount vía la tasa efectiva; esto es la etiqueta para que el
  // repartidor sepa que entrega por transferencia. Si la columna no existe, se
  // ignora sin romper la aceptación.
  if (useTransfer) {
    await supabase
      .from("remittances")
      .update({ delivery_method: "transferencia" })
      .eq("id", remId);
  }

  // Bono de puntos de una promo "Bono" (0053): se acreditan al cliente al
  // aceptar (no toca el precio). Solo si hay cuenta de cliente real.
  if (bonusPoints > 0 && order.client_id) {
    await supabase.from("points_ledger").insert({
      operator_id: tid,
      client_id: order.client_id,
      delta: bonusPoints,
      reason: "bono",
      order_id: order.id,
    });
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

  // Aviso al cliente de que su envío fue aceptado.
  if (order.client_id) {
    await notify([order.client_id], {
      type: "pedido_aceptado",
      title: "Envío aceptado 📦",
      body: `Ya preparamos tu envío para ${order.beneficiary_name || "tu familia"}.`,
      url: `/c/pedidos/${id}`,
      operatorId: tid,
    });
  }
  // Aviso al repartidor asignado (si el operador asignó uno).
  if (delivererId && delivererId !== ctx.userId) {
    await notify([delivererId], {
      type: "reparto_asignado",
      title: "Entrega asignada 🛵",
      body: `Se te asignó $${amountUsd} para ${order.beneficiary_name || "un beneficiario"}${
        order.province ? ` en ${order.province}` : ""
      }.`,
      url: remId ? `/remesas/${remId}` : "/remesas",
      operatorId: tid,
    });
  }

  revalidatePath("/pedidos");
  revalidatePath("/remesas");
  revalidatePath("/c");
  revalidatePath("/");
  return remId;
}

// El operador acepta a un repartidor pendiente de su equipo.
export async function approveMember(userId: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  await supabase.rpc("approve_member", { p_user: userId });
  await notify([userId], {
    type: "equipo_aprobado",
    title: "¡Aprobado! 🎉",
    body: "Ya formas parte del equipo. Puedes empezar a recibir entregas.",
    url: "/",
    operatorId: ctx.tenantId,
  });
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
  await notify([userId], {
    type: "equipo_removido",
    title: "Ya no estás en el equipo",
    body: "El operador te desvinculó del equipo.",
    url: "/",
    operatorId: ctx.tenantId,
  });
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

// ===== Validación de subidas de archivos =====
// Auditoría (Alto): las subidas no validaban tipo ni tamaño y confiaban en
// file.type (controlado por el cliente). Aquí verificamos el tamaño y el tipo
// REAL por los "magic bytes" del contenido, no por la extensión ni la cabecera.

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// Lee los primeros bytes y confirma que el contenido es una imagen conocida
// (o un PDF, si se permite). No confía en file.type ni en la extensión.
async function sniffAllowed(file: File, allowPdf: boolean): Promise<boolean> {
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const at = (sig: number[], off = 0) => sig.every((b, i) => buf[off + i] === b);
  if (at([0xff, 0xd8, 0xff])) return true; // JPEG
  if (at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return true; // PNG
  if (at([0x47, 0x49, 0x46, 0x38])) return true; // GIF
  if (at([0x52, 0x49, 0x46, 0x46]) && at([0x57, 0x45, 0x42, 0x50], 8)) return true; // WEBP
  // HEIC/HEIF: caja "ftyp" en el offset 4 (típico de fotos de iPhone).
  if (at([0x66, 0x74, 0x79, 0x70], 4)) return true;
  if (allowPdf && at([0x25, 0x50, 0x44, 0x46])) return true; // %PDF
  return false;
}

// Valida un archivo ya conocido como File no vacío: tamaño dentro del límite y
// tipo real permitido. Devuelve true si puede subirse.
async function validUpload(
  file: File,
  opts: { allowPdf?: boolean } = {}
): Promise<boolean> {
  if (file.size > MAX_UPLOAD_BYTES) return false;
  return sniffAllowed(file, !!opts.allowPdf);
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
  if (!(await validUpload(file, { allowPdf: true }))) return;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${table}/${id}/comprobante-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("docs")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return;
  // Guardamos la RUTA del bucket privado (no una URL pública). Se firma al leer.
  await supabase.from(table).update({ receipt_url: path }).eq("id", id);
}

// Comprobante de entrega (separado del pago del cliente). Tolerante si la
// columna aún no existe (migración 0026).
async function handleDeliveryProof(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  id: string
) {
  const file = formData.get("delivery_proof");
  if (!(file instanceof File) || file.size === 0) return;
  if (!(await validUpload(file, { allowPdf: true }))) return;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `remittances/${id}/entrega-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("docs")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return;
  // Guardamos la RUTA del bucket privado (no una URL pública). Se firma al leer.
  await supabase
    .from("remittances")
    .update({ delivery_proof_url: path })
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

  if (inserted?.id) {
    await handleReceiptUpload(supabase, formData, "remittances", inserted.id);
    await handleDeliveryProof(supabase, formData, inserted.id);
    // Forma de entrega (0056, tolerante). La tasa ya trae el bono aplicado, así
    // que el monto está bien; esto solo guarda la etiqueta 'transferencia'.
    if (
      str(formData.get("delivery_currency")) === "CUP" &&
      str(formData.get("delivery_method")) === "transferencia"
    ) {
      await supabase
        .from("remittances")
        .update({ delivery_method: "transferencia" })
        .eq("id", inserted.id);
    }
  }

  await logActivity("remesa.crear", {
    entityType: "remesa",
    entityId: inserted?.id ?? null,
    entityLabel: `$${amountUsd}`,
    details: { amount_usd: amountUsd, deliverer_id: delivererId, client_id: str(formData.get("client_id")) },
  });

  revalidatePath("/remesas");
  revalidatePath("/");
  // "Guardar y compartir": ir al detalle con el comprobante abierto.
  if (str(formData.get("go")) === "share" && inserted?.id) {
    redirect(`/remesas/${inserted.id}?share=1`);
  }
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

  // Forma de entrega (0056, tolerante). La tasa ya trae el bono; esto guarda la
  // etiqueta. Si el form la trae, se respeta (efectivo o transferencia).
  if (formData.get("delivery_method") !== null) {
    const dm =
      str(formData.get("delivery_currency")) === "CUP" &&
      str(formData.get("delivery_method")) === "transferencia"
        ? "transferencia"
        : "efectivo";
    await supabase
      .from("remittances")
      .update({ delivery_method: dm })
      .eq("id", id);
  }

  await handleReceiptUpload(supabase, formData, "remittances", id);
  await handleDeliveryProof(supabase, formData, id);

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
  if (paid) {
    const { data: od } = await supabase
      .from("orders")
      .select("id, client_id, amount_usd")
      .eq("remittance_id", id)
      .maybeSingle();
    const o = od as {
      id: string;
      client_id?: string;
      amount_usd?: number;
    } | null;
    if (o?.client_id) {
      await notify([o.client_id], {
        type: "pago_confirmado",
        title: "Pago confirmado ✅",
        body: `El negocio recibió tu pago de $${o.amount_usd}.`,
        url: `/c/pedidos/${o.id}`,
      });
    }
  }
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
      .select("id, client_id, amount_usd, operator_id, beneficiary_name");
    const o = ord?.[0] as
      | {
          id: string;
          client_id: string | null;
          amount_usd: number;
          operator_id: string;
          beneficiary_name: string | null;
        }
      | undefined;
    // Puntos por la remesa entregada (solo pedidos de clientes registrados).
    if (o?.client_id) {
      // Aviso de entrega al cliente.
      await notify([o.client_id], {
        type: "remesa_entregada",
        title: "¡Remesa entregada! ✅",
        body: `Tu envío para ${o.beneficiary_name || "tu familia"} fue entregado.`,
        url: `/c/pedidos/${o.id}`,
      });
      const { data: bs } = await supabase
        .from("business_settings")
        .select("points_per_usd")
        .eq("operator_id", o.operator_id)
        .maybeSingle();
      const perUsd = Number((bs as { points_per_usd?: number } | null)?.points_per_usd ?? 0.2) || 0;
      const pts = Math.floor(Number(o.amount_usd) * perUsd);
      if (pts > 0) {
        await supabase.from("points_ledger").insert({
          operator_id: o.operator_id,
          client_id: o.client_id,
          delta: pts,
          reason: "remesa",
          order_id: o.id,
        });
        await notify([o.client_id], {
          type: "puntos",
          title: `Ganaste +${pts} puntos ⭐`,
          body: `Gracias por tu envío a ${o.beneficiary_name || "tu familia"}.`,
          url: "/c/puntos",
        });
      }
      // Bono de referido: si este cliente llegó por invitación y aún no se
      // premió, se recompensa a ambos (tolerante si falta la migración 0043).
      try {
        await supabase.rpc("reward_referral", { p_referred: o.client_id });
      } catch {
        /* migración no aplicada aún */
      }
    }
  } else if (status === "en_reparto") {
    // Aviso al cliente de que su remesa va en camino.
    const { data: ord } = await supabase
      .from("orders")
      .select("id, client_id, beneficiary_name")
      .eq("remittance_id", id)
      .maybeSingle();
    const o = ord as {
      id: string;
      client_id: string | null;
      beneficiary_name: string | null;
    } | null;
    if (o?.client_id) {
      await notify([o.client_id], {
        type: "en_camino",
        title: "Tu remesa va en camino 🛵",
        body: `El repartidor salió hacia ${o.beneficiary_name || "tu familia"}. Sigue el mapa en vivo.`,
        url: `/c/pedidos/${o.id}`,
      });
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

// Marcar entregada con comprobante opcional (foto de la entrega). Usa el mismo
// flujo de estado (puntos, pedido vinculado, revalidación) que el cambio de
// estado normal, pero sube antes la foto si el repartidor la adjuntó.
// Sube una firma (data URL PNG) al bucket y guarda signature_url. Tolerante.
async function handleSignature(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  id: string
) {
  const dataUrl = str(formData.get("signature"));
  if (!dataUrl || !dataUrl.startsWith("data:image")) return;
  const base64 = dataUrl.split(",")[1];
  if (!base64) return;
  const bytes = Buffer.from(base64, "base64");
  const path = `remittances/${id}/firma-${Date.now()}.png`;
  const { error } = await supabase.storage
    .from("docs")
    .upload(path, bytes, { upsert: true, contentType: "image/png" });
  if (error) return;
  // Guardamos la RUTA del bucket privado (no una URL pública). Se firma al leer.
  await supabase
    .from("remittances")
    .update({ signature_url: path })
    .eq("id", id);
}

export async function deliverRemittance(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx)) return { ok: false, error: "No autorizado." };
  const id = str(formData.get("id"));
  if (!id) return { ok: false, error: "Falta la remesa." };

  // --- Código de entrega (OTP) ---
  const noCode = str(formData.get("no_code")) === "1";
  if (noCode) {
    const reason = str(formData.get("no_code_reason"));
    await supabase.rpc("deliver_without_code", {
      p_remittance: id,
      p_reason: reason,
    });
    await logActivity("remesa.entrega_sin_codigo", {
      entityType: "remesa",
      entityId: id,
      details: { reason },
    });
  } else {
    const code = str(formData.get("delivery_code"));
    const { data: okCode, error } = await supabase.rpc("verify_delivery_code", {
      p_remittance: id,
      p_code: code,
    });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("intentos")) {
        return {
          ok: false,
          error:
            "Demasiados intentos. Usa 'Entregar sin código' si es necesario.",
        };
      }
      // Si la función aún no existe (migración 0049 sin correr), no bloquear.
      if (error.code !== "42883" && error.code !== "PGRST202") {
        return { ok: false, error: "No se pudo verificar el código." };
      }
    } else if (okCode === false) {
      return {
        ok: false,
        error: "Código incorrecto. Verifícalo con el remitente.",
      };
    }
  }

  await handleDeliveryProof(supabase, formData, id);
  await handleSignature(supabase, formData, id);
  // Foto del carné de quien recibe (tolerante — columna 0039).
  const idPhoto = formData.get("id_photo");
  if (idPhoto instanceof File && idPhoto.size > 0 && (await validUpload(idPhoto, { allowPdf: true }))) {
    const ext = (idPhoto.name.split(".").pop() || "jpg").toLowerCase();
    const path = `remittances/${id}/carne-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("docs")
      .upload(path, idPhoto, { upsert: true, contentType: idPhoto.type });
    if (!error) {
      // Guardamos la RUTA del bucket privado (no una URL pública). Se firma al leer.
      await supabase
        .from("remittances")
        .update({ id_photo_url: path })
        .eq("id", id);
    }
  }
  // "Recibido por" (tolerante si las columnas no existen — migración 0035).
  const receivedByName = str(formData.get("received_by_name"));
  const receivedById = str(formData.get("received_by_id"));
  if (receivedByName || receivedById) {
    await supabase
      .from("remittances")
      .update({
        received_by_name: receivedByName,
        received_by_id: receivedById,
      })
      .eq("id", id);
  }
  // updateRemittanceStatus notifica la entrega al cliente (choke point único).
  await updateRemittanceStatus(id, "entregado");
  return { ok: true };
}

// Gastos de reparto del repartidor (transporte, etc.), para su ganancia neta.
export async function addDeliveryExpense(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (ctx.isOperador || !ctx.userId) return;
  const amount = num(formData.get("amount"));
  if (!amount || amount <= 0) return;
  const tid = await currentTenantId();
  if (!tid) return;
  await supabase.from("delivery_expenses").insert({
    operator_id: tid,
    deliverer_id: ctx.userId,
    amount,
    note: str(formData.get("note")),
  });
  revalidatePath("/finanzas");
  revalidatePath("/");
}

export async function deleteDeliveryExpense(id: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.userId) return;
  await supabase
    .from("delivery_expenses")
    .delete()
    .eq("id", id)
    .eq("deliverer_id", ctx.userId);
  revalidatePath("/finanzas");
  revalidatePath("/");
}

// El repartidor avisa al operador que su saldo está listo para liquidar. Queda
// registrado en la actividad del negocio (el operador lo ve en /actividad).
export async function requestSettlement(amount: number) {
  const ctx = await getSessionContext();
  if (ctx.isOperador) return; // solo el repartidor pide cobrar
  await logActivity("repartidor.liquidar", {
    entityType: "saldo",
    details: { amount },
  });
  revalidatePath("/finanzas");
}

// Meta personal (mensual) del repartidor, en su propio perfil. Tolerante si la
// columna monthly_goal aún no existe (migración 0032).
export async function updatePersonalGoal(
  value: number | null,
  count?: number | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ monthly_goal: value && value > 0 ? value : null })
    .eq("id", user.id);
  // Meta de número de entregas (tolerante — columna 0040).
  if (count !== undefined) {
    await supabase
      .from("profiles")
      .update({ monthly_goal_count: count && count > 0 ? Math.round(count) : null })
      .eq("id", user.id);
  }
  revalidatePath("/");
}

// El repartidor guarda su zona de cobertura (provincias, separadas por comas).
// Tolerante si la columna coverage_provinces no existe (migración 0037).
export async function updateCoverage(provinces: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const csv = provinces.map((p) => p.trim()).filter(Boolean).join(", ");
  await supabase
    .from("profiles")
    .update({ coverage_provinces: csv || null })
    .eq("id", user.id);
  revalidatePath("/perfil");
  revalidatePath("/pedidos");
}

// El repartidor devuelve una remesa que no puede entregar: se quita como
// repartidor asignado (queda sin asignar) para que el operador la reasigne.
export async function returnRemittanceToOperator(id: string, reason?: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (ctx.isOperador || !ctx.userId) return; // acción del repartidor
  // Solo puede devolver una remesa que es suya y sigue pendiente.
  const { data: r } = await supabase
    .from("remittances")
    .select("deliverer_id, status")
    .eq("id", id)
    .maybeSingle();
  const row = r as { deliverer_id?: string | null; status?: string } | null;
  if (!row || row.deliverer_id !== ctx.userId || row.status !== "pendiente")
    return;
  await supabase
    .from("remittances")
    .update({ deliverer_id: null, en_route_at: null })
    .eq("id", id);
  await logActivity("remesa.devuelta", {
    entityType: "remesa",
    entityId: id,
    details: { reason: reason?.trim() || null },
  });
  revalidatePath("/remesas");
  revalidatePath(`/remesas/${id}`);
  revalidatePath("/");
}

// El repartidor registra un intento fallido de entrega (incidencia). La remesa
// sigue pendiente para reintentar. Tolerante si las columnas no existen (0036).
export async function logDeliveryIncident(id: string, reason: string) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx)) return;
  const r = reason.trim();
  if (!r) return;
  const { data: cur } = await supabase
    .from("remittances")
    .select("incident_count")
    .eq("id", id)
    .maybeSingle();
  const count =
    Number((cur as { incident_count?: number } | null)?.incident_count ?? 0) || 0;
  await supabase
    .from("remittances")
    .update({
      last_incident: r,
      incident_at: new Date().toISOString(),
      incident_count: count + 1,
      en_route_at: null, // ya no está "en camino" tras un intento fallido
    })
    .eq("id", id);
  await logActivity("remesa.incidencia", {
    entityType: "remesa",
    entityId: id,
    details: { reason: r },
  });
  revalidatePath("/remesas");
  revalidatePath(`/remesas/${id}`);
  revalidatePath("/");
}

// El repartidor programa (o quita) un recordatorio de entrega para una remesa.
// Tolerante si la columna reminder_at no existe (migración 0041).
export async function setDeliveryReminder(id: string, iso: string | null) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx)) return;
  await supabase
    .from("remittances")
    .update({ reminder_at: iso })
    .eq("id", id);
  revalidatePath("/remesas");
  revalidatePath(`/remesas/${id}`);
  revalidatePath("/");
}

// El repartidor marca (o desmarca) que salió a entregar una remesa pendiente.
// Solo escribe una marca de tiempo; no cambia el estado. Tolerante si la
// columna en_route_at aún no existe (migración 0031).
export async function setRemittanceEnRoute(id: string, on: boolean) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx)) return;
  await supabase
    .from("remittances")
    .update({ en_route_at: on ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/remesas");
  revalidatePath(`/remesas/${id}`);
  revalidatePath("/");
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
    .select("remittance_id, client_id, beneficiary_name")
    .eq("id", id)
    .eq("operator_id", ctx.tenantId)
    .maybeSingle();
  const ordRow = ord as {
    remittance_id?: string | null;
    client_id?: string | null;
    beneficiary_name?: string | null;
  } | null;
  const remId = ordRow?.remittance_id ?? null;
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

  if (ordRow?.client_id) {
    await notify([ordRow.client_id], {
      type: "pedido_cancelado_neg",
      title: "Envío cancelado",
      body: `Tu envío para ${ordRow.beneficiary_name || "tu familia"} fue cancelado por el negocio.`,
      url: `/c/pedidos/${id}`,
      operatorId: ctx.tenantId,
    });
  }
  await logActivity("pedido.cancelar", { entityType: "pedido", entityId: id });
  revalidatePath("/pedidos");
  revalidatePath("/remesas");
  revalidatePath("/");
  revalidatePath("/c");
  revalidatePath("/c/pedidos");
}

// ============ CLIENTES ============

// Marca quién creó una entrada de agenda (para aislar la agenda por repartidor).
// Tolerante: si la columna created_by aún no existe (migración 0046), no hace nada.
async function stampCreator(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "clients" | "beneficiaries",
  id: string | null | undefined,
  userId: string | null | undefined
) {
  if (!id || !userId) return;
  await supabase.from(table).update({ created_by: userId }).eq("id", id);
}

export async function createClientRecord(formData: FormData) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
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
    const { data } = await supabase
      .from("clients")
      .insert({ ...values, ...(tid ? { operator_id: tid } : {}) })
      .select("id")
      .single();
    await stampCreator(supabase, "clients", (data as { id?: string } | null)?.id, ctx.userId);
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
  const ctx = await getSessionContext();
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
  await stampCreator(supabase, "clients", clientId, ctx.userId);

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
    // Marca al creador de todos los beneficiarios recién creados de este cliente.
    if (clientId && ctx.userId) {
      await supabase
        .from("beneficiaries")
        .update({ created_by: ctx.userId })
        .eq("client_id", clientId);
    }
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
  const ctx = await getSessionContext();
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
    await stampCreator(supabase, "beneficiaries", targetId, ctx.userId);
  }

  // Método de entrega preferido y dirección, aparte (tolerante si las columnas
  // no existen aún — migraciones 0033 para address).
  if (targetId) {
    await supabase
      .from("beneficiaries")
      .update({ preferred_delivery: str(formData.get("preferred_delivery")) })
      .eq("id", targetId);
    const address = formData.get("address");
    if (address !== null) {
      await supabase
        .from("beneficiaries")
        .update({ address: str(address) })
        .eq("id", targetId);
    }
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

// Alta rápida de cliente desde el formulario de remesa (devuelve el registro).
export async function quickAddClient(name: string, phone?: string | null) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx) || !ctx.tenantId) return null;
  const { data } = await supabase
    .from("clients")
    .insert({
      name: name.trim() || "Sin nombre",
      phone: phone?.trim() || null,
      operator_id: ctx.tenantId,
    })
    .select("id, name")
    .single();
  await stampCreator(supabase, "clients", (data as { id?: string } | null)?.id, ctx.userId);
  revalidatePath("/agenda");
  return (data as { id: string; name: string } | null) ?? null;
}

// Alta rápida de beneficiario desde el formulario de remesa.
export async function quickAddBeneficiary(input: {
  name: string;
  province?: string | null;
  phone?: string | null;
  clientId?: string | null;
}) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!isStaff(ctx) || !ctx.tenantId) return null;
  const { data } = await supabase
    .from("beneficiaries")
    .insert({
      name: input.name.trim() || "Sin nombre",
      province: input.province?.trim() || null,
      phone: input.phone?.trim() || null,
      client_id: input.clientId || null,
      operator_id: ctx.tenantId,
    })
    .select("id, name, province, client_id")
    .single();
  await stampCreator(supabase, "beneficiaries", (data as { id?: string } | null)?.id, ctx.userId);
  revalidatePath("/agenda");
  return (
    (data as {
      id: string;
      name: string;
      province: string | null;
      client_id: string | null;
    } | null) ?? null
  );
}

// Vincular / desvincular un beneficiario a un cliente (client_id).
export async function setBeneficiaryClient(
  beneficiaryId: string,
  clientId: string | null
) {
  const supabase = await createClient();
  await supabase
    .from("beneficiaries")
    .update({ client_id: clientId })
    .eq("id", beneficiaryId);
  revalidatePath("/agenda");
  revalidatePath(`/agenda/beneficiario/${beneficiaryId}`);
  if (clientId) revalidatePath(`/agenda/cliente/${clientId}`);
}

// Fusiona contactos duplicados en uno (el que se mantiene). Reasigna sus
// remesas (y, para clientes, sus beneficiarios) al que se queda y borra los
// demás. Sin pérdida de historial. Solo el operador.
export async function mergeContacts(
  kind: "cliente" | "beneficiario",
  keepId: string,
  dropIds: string[]
) {
  const supabase = await createClient();
  const ctx = await getSessionContext();
  if (!ctx.isOperador || !ctx.tenantId) return;
  const tid = ctx.tenantId;
  const drops = dropIds.filter((id) => id && id !== keepId);
  if (!keepId || drops.length === 0) return;

  if (kind === "cliente") {
    await supabase
      .from("remittances")
      .update({ client_id: keepId })
      .in("client_id", drops)
      .eq("operator_id", tid);
    await supabase
      .from("beneficiaries")
      .update({ client_id: keepId })
      .in("client_id", drops)
      .eq("operator_id", tid);
    await supabase.from("clients").delete().in("id", drops).eq("operator_id", tid);
  } else {
    await supabase
      .from("remittances")
      .update({ beneficiary_id: keepId })
      .in("beneficiary_id", drops)
      .eq("operator_id", tid);
    await supabase
      .from("beneficiaries")
      .delete()
      .in("id", drops)
      .eq("operator_id", tid);
  }

  await logActivity("contacto.fusionar", {
    entityType: kind,
    entityId: keepId,
    details: { fusionados: drops.length },
  });
  revalidatePath("/agenda");
}

// Nota rápida: actualiza SOLO el campo de notas del contacto (sin tocar el
// resto de datos).
export async function updateContactNotes(
  kind: "cliente" | "beneficiario",
  id: string,
  notes: string
) {
  const supabase = await createClient();
  const table = kind === "cliente" ? "clients" : "beneficiaries";
  await supabase
    .from(table)
    .update({ notes: notes.trim() || null })
    .eq("id", id);
  revalidatePath(`/agenda/${kind}/${id}`);
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
  // % extra de la transferencia (aparte, tolerante si no existe — 0056).
  const tbonus = formData.get("transfer_bonus_pct");
  if (tbonus !== null && String(tbonus).trim() !== "") {
    await supabase
      .from("business_settings")
      .update({ transfer_bonus_pct: num(tbonus) })
      .eq(keyField, keyVal);
    revalidatePath("/c", "layout");
    revalidatePath("/c/tienda");
  }
  // Color de marca para la app del cliente (aparte, tolerante — 0029).
  const hue = formData.get("brand_hue");
  if (hue !== null) {
    const trimmed = String(hue).trim();
    await supabase
      .from("business_settings")
      .update({ brand_hue: trimmed === "" ? null : num(hue) })
      .eq(keyField, keyVal);
    revalidatePath("/c", "layout");
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
  // Bono por referido (aparte, tolerante — 0043).
  const rp = formData.get("referral_points");
  if (rp !== null && String(rp).trim() !== "") {
    await supabase
      .from("business_settings")
      .update({ referral_points: Math.round(num(rp)) })
      .eq(keyField, keyVal);
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
  // Foto de perfil (tolerante — columna 0027).
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0 && (await validUpload(avatar))) {
    const ext = (avatar.name.split(".").pop() || "jpg").toLowerCase();
    const path = `avatars/${user.id}/a-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("receipts")
      .upload(path, avatar, { upsert: true, contentType: avatar.type });
    if (!error) {
      const { data } = supabase.storage.from("receipts").getPublicUrl(path);
      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);
    }
  }
  revalidatePath("/perfil");
  revalidatePath("/ajustes");
}

// ============ SUPER-ADMIN (solo el dueño) ============
// Doble candado: comprobamos el correo aquí (servidor) y, además, cada RPC
// vuelve a comprobar is_superadmin() en la base. Si no eres el dueño, ni la
// pantalla ni los datos responden.

async function assertSuperAdmin(): Promise<boolean> {
  const { isSuperAdmin } = await import("@/lib/admin");
  return isSuperAdmin();
}

export async function adminSetRole(formData: FormData) {
  if (!(await assertSuperAdmin())) return;
  const userId = String(formData.get("user_id") || "");
  const roleRaw = String(formData.get("role") || "");
  if (!userId) return;
  const role = roleRaw === "" ? null : roleRaw;
  const supabase = await createClient();
  await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });
  revalidatePath("/admin");
}

export async function adminSetMemberStatus(formData: FormData) {
  if (!(await assertSuperAdmin())) return;
  const userId = String(formData.get("user_id") || "");
  const status = String(formData.get("status") || "");
  if (!userId || !status) return;
  const supabase = await createClient();
  await supabase.rpc("admin_set_member_status", {
    p_user: userId,
    p_status: status,
  });
  revalidatePath("/admin");
}

export async function adminBroadcast(formData: FormData) {
  if (!(await assertSuperAdmin())) return;
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const emoji = String(formData.get("emoji") || "").trim();
  if (!title) return;
  const supabase = await createClient();
  await supabase.rpc("admin_broadcast", {
    p_title: title,
    p_body: body || null,
    p_emoji: emoji || null,
  });
  revalidatePath("/admin");
}

// Centro de notificaciones (cliente): marcar como vistas al abrir la campana.
export async function markNotificationsSeen(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  // Tolerante si la columna aún no existe (migración 0051).
  await supabase
    .from("profiles")
    .update({ notifications_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}
