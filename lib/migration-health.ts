import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";

// Chequeo de "salud" de migraciones: prueba si las columnas/tablas/funciones
// opcionales existen en la base real. Sirve para avisarle al operador qué SQL
// le falta correr, en vez de que las funciones fallen en silencio.

export type MissingItem = {
  feature: string; // qué deja de funcionar
  migration: string; // archivo/número
  sql: string; // qué correr
};

type ColCheck = {
  table: string;
  column: string;
  feature: string;
  migration: string;
};

const COLUMN_CHECKS: ColCheck[] = [
  { table: "remittances", column: "reject_reason", feature: "Motivo de rechazo de pedidos", migration: "0024" },
  { table: "offers", column: "featured", feature: "Ofertas destacadas / vistas", migration: "0025" },
  { table: "remittances", column: "delivery_proof_url", feature: "Foto de comprobante de entrega", migration: "0026" },
  { table: "profiles", column: "avatar_url", feature: "Foto de perfil", migration: "0027" },
  { table: "business_settings", column: "brand_hue", feature: "Color de marca del negocio", migration: "0029" },
  { table: "remittances", column: "en_route_at", feature: "Estado 'En camino'", migration: "0031" },
  { table: "profiles", column: "monthly_goal", feature: "Meta personal del repartidor", migration: "0032" },
  { table: "beneficiaries", column: "address", feature: "Dirección del beneficiario", migration: "0033" },
  { table: "remittances", column: "received_by_name", feature: "Recibido por (nombre/carné)", migration: "0035" },
  { table: "remittances", column: "last_incident", feature: "Incidencias / intento fallido", migration: "0036" },
  { table: "profiles", column: "coverage_provinces", feature: "Zona de cobertura", migration: "0037" },
  { table: "remittances", column: "signature_url", feature: "Firma de recepción", migration: "0038" },
  { table: "remittances", column: "id_photo_url", feature: "Foto del carné", migration: "0039" },
  { table: "profiles", column: "monthly_goal_count", feature: "Meta de número de entregas", migration: "0040" },
  { table: "remittances", column: "reminder_at", feature: "Recordatorio de entrega", migration: "0041" },
  { table: "profiles", column: "referral_code", feature: "Programa de referidos", migration: "0043" },
  { table: "beneficiaries", column: "created_by", feature: "Aislar agenda del repartidor por autor", migration: "0046" },
];

type TableCheck = { table: string; probe: string; feature: string; migration: string };
const TABLE_CHECKS: TableCheck[] = [
  { table: "delivery_expenses", probe: "id", feature: "Gastos de reparto", migration: "0034" },
  { table: "reviews", probe: "id", feature: "Reseñas / calificaciones", migration: "0044" },
  { table: "announcements", probe: "id", feature: "Anuncios a clientes", migration: "0045" },
];

type RpcCheck = { fn: string; args?: Record<string, unknown>; feature: string; migration: string };
const RPC_CHECKS: RpcCheck[] = [
  { fn: "my_operator_contact", feature: "WhatsApp del negocio (cliente)", migration: "0028" },
  { fn: "package_popularity", feature: "Orden por popularidad (Tienda)", migration: "0030" },
];

const sqlHint = (m: string) =>
  `Corre supabase/migrations/${m}_*.sql en el SQL Editor.`;

export async function getMigrationHealth(): Promise<{
  ok: boolean;
  missing: MissingItem[];
}> {
  const ctx = await getSessionContext();
  // Solo el operador puede correr SQL; a los demás no les mostramos esto.
  if (!ctx.isOperador) return { ok: true, missing: [] };
  const supabase = await createClient();

  const colProbes = COLUMN_CHECKS.map(async (c) => {
    const { error } = await supabase.from(c.table).select(c.column).limit(1);
    // 42703 = columna inexistente, 42P01 = tabla inexistente.
    if (error && (error.code === "42703" || error.code === "42P01")) {
      return {
        feature: c.feature,
        migration: c.migration,
        sql: sqlHint(c.migration),
      } as MissingItem;
    }
    return null;
  });

  const tableProbes = TABLE_CHECKS.map(async (t) => {
    const { error } = await supabase.from(t.table).select(t.probe).limit(1);
    if (error && error.code === "42P01") {
      return {
        feature: t.feature,
        migration: t.migration,
        sql: sqlHint(t.migration),
      } as MissingItem;
    }
    return null;
  });

  const rpcProbes = RPC_CHECKS.map(async (r) => {
    const { error } = await supabase.rpc(r.fn, r.args ?? {});
    // 42883 = función inexistente. (PGRST202 = no encontrada vía PostgREST.)
    if (error && (error.code === "42883" || error.code === "PGRST202")) {
      return {
        feature: r.feature,
        migration: r.migration,
        sql: sqlHint(r.migration),
      } as MissingItem;
    }
    return null;
  });

  const results = await Promise.all([
    ...colProbes,
    ...tableProbes,
    ...rpcProbes,
  ]);
  const missing = results.filter(Boolean) as MissingItem[];
  // Ordena por número de migración.
  missing.sort((a, b) => a.migration.localeCompare(b.migration));
  return { ok: missing.length === 0, missing };
}
