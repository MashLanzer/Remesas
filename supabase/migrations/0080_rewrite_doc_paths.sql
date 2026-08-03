-- =============================================================
-- Reescribir columnas de documentos: URL pública (receipts) → ruta (docs)
-- Ejecuta este archivo en el SQL Editor de Supabase.
--
-- IMPORTANTE — ORDEN:
--   Ejecuta esto SOLO DESPUÉS de haber corrido scripts/migrate-sensitive-docs.mjs
--   (que copia los archivos a docs). Si lo corres antes, las imágenes de los
--   registros antiguos no se verán hasta que los archivos estén en docs.
--
-- QUÉ HACE:
--   Convierte las URLs públicas guardadas (…/object/public/receipts/<ruta>) en
--   la <ruta> pelada, que es lo que el código nuevo firma contra el bucket
--   privado docs. Solo toca filas que aún tengan el formato de URL pública.
--
--   split_part(col, '/receipts/', 2) devuelve todo lo que va después de
--   "/receipts/" — justo la ruta del objeto (payments/…, remittances/…, etc.).
-- =============================================================

update public.orders
  set payment_proof_url = split_part(payment_proof_url, '/receipts/', 2)
  where payment_proof_url like '%/object/public/receipts/%';

update public.remittances
  set receipt_url = split_part(receipt_url, '/receipts/', 2)
  where receipt_url like '%/object/public/receipts/%';

update public.remittances
  set delivery_proof_url = split_part(delivery_proof_url, '/receipts/', 2)
  where delivery_proof_url like '%/object/public/receipts/%';

update public.remittances
  set signature_url = split_part(signature_url, '/receipts/', 2)
  where signature_url like '%/object/public/receipts/%';

update public.remittances
  set id_photo_url = split_part(id_photo_url, '/receipts/', 2)
  where id_photo_url like '%/object/public/receipts/%';

update public.settlements
  set receipt_url = split_part(receipt_url, '/receipts/', 2)
  where receipt_url like '%/object/public/receipts/%';

update public.vaquita_contributions
  set proof_url = split_part(proof_url, '/receipts/', 2)
  where proof_url like '%/object/public/receipts/%';

-- Paso final OPCIONAL (cuando hayas verificado que todo se ve bien):
-- borrar los originales sensibles del bucket público receipts. Déjalo para
-- después de comprobar; hasta entonces los originales no molestan (las columnas
-- ya apuntan a docs). El borrado se hace con la API de Storage o el dashboard.
