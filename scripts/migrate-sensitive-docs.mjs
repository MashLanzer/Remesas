// =============================================================
// Migración de una sola vez: mover documentos sensibles del bucket PÚBLICO
// "receipts" al bucket PRIVADO "docs" (auditoría, Crítico S1).
//
// QUÉ HACE (seguro, no destructivo):
//   1. Copia (NO mueve) todos los archivos bajo los prefijos sensibles
//      (payments/, remittances/, settlements/, vaquitas/) de receipts → docs.
//   2. NO borra los originales: si algo falla, nada se pierde. El borrado se
//      hace en un paso posterior, ya verificado (ver instrucciones al final).
//
// ORDEN CORRECTO (importante para no romper imágenes):
//   Paso 1: aplicar la migración 0079 (crear el bucket privado docs).
//   Paso 2: ejecutar ESTE script (copia los archivos).
//   Paso 3: ejecutar el SQL de 0080 (reescribe las columnas de URL → ruta).
//   Paso 4 (opcional, más tarde): borrar los originales sensibles de receipts.
//
// CÓMO EJECUTARLO (en tu máquina, no en el navegador):
//   SUPABASE_URL="https://TUPROYECTO.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key" \
//   node scripts/migrate-sensitive-docs.mjs
//
// La service-role key es SECRETA: no la pegues en ningún chat ni la subas al
// repo. Úsala solo aquí, en tu terminal.
// =============================================================

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error(
    "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno."
  );
  process.exit(1);
}

const sb = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Prefijos SENSIBLES que hay que privatizar. Lo no sensible (announcements/,
// offers/, packages/, avatars/) se queda en receipts.
const SENSITIVE_PREFIXES = [
  "payments",
  "remittances",
  "settlements",
  "vaquitas",
];

// Lista recursiva de todas las rutas de archivo bajo un prefijo del bucket.
async function listAll(bucket, prefix) {
  const out = [];
  async function walk(dir) {
    const { data, error } = await sb.storage
      .from(bucket)
      .list(dir, { limit: 1000 });
    if (error) {
      console.error(`  ! error listando ${dir}: ${error.message}`);
      return;
    }
    for (const entry of data ?? []) {
      const full = dir ? `${dir}/${entry.name}` : entry.name;
      // Las carpetas no tienen id; los archivos sí.
      if (entry.id === null || entry.id === undefined) {
        await walk(full);
      } else {
        out.push(full);
      }
    }
  }
  await walk(prefix);
  return out;
}

let copied = 0;
let skipped = 0;
let failed = 0;

for (const prefix of SENSITIVE_PREFIXES) {
  console.log(`\n== Prefijo: ${prefix}/ ==`);
  const paths = await listAll("receipts", prefix);
  console.log(`  ${paths.length} archivo(s) encontrados.`);
  for (const path of paths) {
    // ¿Ya existe en docs? (idempotente: se puede re-ejecutar sin duplicar)
    const { error: copyErr } = await sb.storage
      .from("receipts")
      .copy(path, path, { destinationBucket: "docs" });
    if (copyErr) {
      if (/exists|duplicate/i.test(copyErr.message)) {
        skipped++;
      } else {
        failed++;
        console.error(`  ! ${path}: ${copyErr.message}`);
      }
    } else {
      copied++;
    }
  }
}

console.log(
  `\nListo. Copiados: ${copied} · Ya estaban: ${skipped} · Fallidos: ${failed}`
);
console.log(
  "Ahora ejecuta el SQL de 0080 para reescribir las columnas (URL → ruta)."
);
