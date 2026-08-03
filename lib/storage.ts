import "server-only";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

// Lectura de documentos sensibles del bucket privado "docs" mediante URLs
// firmadas y temporales. Toda la lógica vive en el servidor: el cliente nunca
// recibe una URL pública permanente, solo un enlace firmado que caduca.

const DOCS_BUCKET = "docs";
const SIGNED_TTL = 60 * 60; // 1 hora

// Cliente con service_role: firma URLs de cualquier objeto (fuera de RLS). El
// control de acceso lo hacen las server actions/páginas que llaman aquí.
function adminSb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !SUPABASE_URL) return null;
  return createSbClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ¿El valor guardado es una URL http(s) completa (esquema antiguo, bucket
// público receipts) o una ruta del bucket privado docs (esquema nuevo)?
function isFullUrl(v: string): boolean {
  return /^https?:\/\//i.test(v);
}

// Convierte un valor guardado en una URL utilizable para <img src>:
//  - Si es una ruta del bucket privado docs → devuelve una URL firmada temporal.
//  - Si es una URL completa (archivo antiguo aún en receipts) → la devuelve tal
//    cual (sigue funcionando hasta que se migre).
// Tolerante: ante cualquier fallo devuelve null (la imagen simplemente no sale).
export async function signDoc(
  value: string | null | undefined
): Promise<string | null> {
  if (!value) return null;
  if (isFullUrl(value)) return value; // archivo antiguo (receipts público)
  const sb = adminSb();
  if (!sb) return null; // sin service_role no podemos firmar
  try {
    const { data, error } = await sb.storage
      .from(DOCS_BUCKET)
      .createSignedUrl(value, SIGNED_TTL);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

// Firma una lista de valores en paralelo, conservando el orden y los nulos.
// Útil para listas (pedidos con comprobante, aportes de vaquita, etc.).
export async function signDocMany(
  values: (string | null | undefined)[]
): Promise<(string | null)[]> {
  return Promise.all(values.map((v) => signDoc(v)));
}
