-- =============================================================
-- Seguridad Storage — límite de tamaño del bucket "receipts"
-- Ejecuta este archivo en el SQL Editor de Supabase.
--
-- PROBLEMA (auditoría, Alto):
--   Las subidas no tenían cota de tamaño. Un atacante (incluida la subida
--   ANÓNIMA permitida para la vaquita, 0074) podía subir archivos enormes
--   directamente a la API de Storage con la anon key, saltándose la
--   validación de las server actions → abuso de almacenamiento / DoS.
--
-- ARREGLO:
--   Fijar file_size_limit en el propio bucket. Supabase lo aplica a NIVEL DE
--   STORAGE en TODA subida, venga de una server action o de una llamada
--   directa con la anon key. Es el respaldo que la validación de la app (que
--   verifica los "magic bytes" del contenido) no puede dar contra llamadas
--   que no pasan por la app.
--
-- NOTA sobre el tipo (MIME):
--   No fijamos allowed_mime_types en el bucket a propósito: la validación de
--   TIPO se hace en la app leyendo los bytes reales del archivo (más fiable
--   que el content-type declarado, que el cliente controla). El allowlist de
--   Storage se basa en ese content-type declarado y podría rechazar subidas
--   legítimas sin type; preferimos la comprobación por contenido.
-- =============================================================

update storage.buckets
  set file_size_limit = 10485760  -- 10 MB
  where id = 'receipts';
