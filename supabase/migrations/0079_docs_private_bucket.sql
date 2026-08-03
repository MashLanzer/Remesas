-- =============================================================
-- Seguridad Storage — bucket PRIVADO "docs" para documentos sensibles
-- Ejecuta este archivo en el SQL Editor de Supabase.
--
-- PROBLEMA (auditoría, Crítico S1):
--   Los documentos sensibles (comprobantes de pago, comprobantes de remesa/
--   entrega, firmas, fotos de carné, comprobantes de vaquita) se guardaban en
--   el bucket público "receipts" y se servían con getPublicUrl() → cualquiera
--   con la URL podía descargarlos.
--
-- ARREGLO (enfoque de dos buckets):
--   - "receipts" (público) se queda SOLO para lo no sensible: imágenes de
--     anuncios/ofertas/paquetes y avatares.
--   - "docs" (PRIVADO, este archivo) para lo sensible. Se leen con URLs
--     firmadas y temporales generadas en el servidor (service_role); nadie
--     puede acceder por URL directa.
--
-- MIGRACIÓN de los archivos ya subidos: se hace con un script aparte de una
--   sola vez (mueve de receipts→docs y reescribe las columnas a rutas). Hasta
--   entonces, los archivos antiguos siguen sirviéndose como estaban (el código
--   detecta si el valor guardado es una URL vieja o una ruta nueva).
-- =============================================================

-- Bucket privado, tope de 10 MB por archivo.
insert into storage.buckets (id, name, public, file_size_limit)
values ('docs', 'docs', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

-- INSERT: usuarios autenticados pueden subir cualquier documento propio.
drop policy if exists "docs_insert_auth" on storage.objects;
create policy "docs_insert_auth" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'docs');

-- INSERT anónimo: SOLO comprobantes de vaquita, bajo el prefijo vaquitas/
-- (el enlace público de la vaquita permite aportar sin login).
drop policy if exists "docs_insert_anon_vaquita" on storage.objects;
create policy "docs_insert_anon_vaquita" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'docs' and (storage.foldername(name))[1] = 'vaquitas'
  );

-- SELECT: solo el dueño lee directamente. Para el resto de lecturas legítimas
-- (el operador viendo el comprobante del cliente) el servidor firma la URL con
-- service_role, que ignora RLS. Nadie más puede leer por acceso directo.
drop policy if exists "docs_select_owner" on storage.objects;
create policy "docs_select_owner" on storage.objects
  for select to authenticated
  using (bucket_id = 'docs' and owner = auth.uid());

-- UPDATE/DELETE: solo el dueño de su propio objeto.
drop policy if exists "docs_update_owner" on storage.objects;
create policy "docs_update_owner" on storage.objects
  for update to authenticated
  using (bucket_id = 'docs' and owner = auth.uid())
  with check (bucket_id = 'docs' and owner = auth.uid());

drop policy if exists "docs_delete_owner" on storage.objects;
create policy "docs_delete_owner" on storage.objects
  for delete to authenticated
  using (bucket_id = 'docs' and owner = auth.uid());
