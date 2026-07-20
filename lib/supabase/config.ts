// Configuración de conexión a Supabase.
//
// La URL y la llave "anon" son valores PÚBLICOS por diseño (van en el cliente y
// están protegidos por las políticas RLS de la base de datos). Por eso es seguro
// dejarlos aquí como valor por defecto.
//
// Se usa la variable de entorno si está presente y es VÁLIDA; si falta o viene
// corrupta (p. ej. una llave pegada enmascarada con "•"), se cae a este valor
// correcto para que la app nunca se rompa por un mal copiado.

const FALLBACK_URL = "https://hizahmllgcgtscqfrris.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpemFobWxsZ2NndHNjcWZycmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTU1NTgsImV4cCI6MjEwMDA3MTU1OH0.AKbPMvHNRyt9EfrV99TFJumryVgtmRlkKPuqsZ-d2c0";

// Solo caracteres Latin1 (0-255). El "•" (8226) queda fuera → llave inválida.
const hasOnlyLatin1 = (v: string) => !/[^\x00-\xff]/.test(v);

function pickUrl(v: string | undefined): string {
  if (v && v.startsWith("http") && hasOnlyLatin1(v)) return v;
  return FALLBACK_URL;
}

function pickKey(v: string | undefined): string {
  // Un JWT válido tiene 3 partes separadas por puntos y solo caracteres ASCII.
  if (v && v.split(".").length === 3 && hasOnlyLatin1(v)) return v;
  return FALLBACK_ANON_KEY;
}

export const SUPABASE_URL = pickUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = pickKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
