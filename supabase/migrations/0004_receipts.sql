-- =============================================================
-- Remesas — foto del comprobante (Supabase Storage)
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- =============================================================

-- Columna con la URL de la foto del comprobante
alter table public.remittances
  add column if not exists receipt_url text;

-- Bucket público para los comprobantes
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Permisos: cualquier usuario autenticado sube/edita; lectura pública
drop policy if exists "receipts_insert" on storage.objects;
create policy "receipts_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts');

drop policy if exists "receipts_update" on storage.objects;
create policy "receipts_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts');

drop policy if exists "receipts_delete" on storage.objects;
create policy "receipts_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts');

drop policy if exists "receipts_select" on storage.objects;
create policy "receipts_select" on storage.objects
  for select using (bucket_id = 'receipts');
