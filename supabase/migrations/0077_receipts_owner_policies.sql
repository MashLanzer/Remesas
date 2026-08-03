-- =============================================================
-- Seguridad Storage — endurecer UPDATE/DELETE del bucket "receipts"
-- Ejecuta este archivo en el SQL Editor de Supabase.
--
-- PROBLEMA (auditoría, Crítico):
--   Las políticas de UPDATE y DELETE solo comprobaban bucket_id='receipts',
--   sin verificar dueño. Cualquier usuario autenticado podía SOBRESCRIBIR o
--   BORRAR *todos* los comprobantes de pago, fotos de identidad y firmas de
--   toda la plataforma (sabotaje / pérdida de evidencia entre negocios).
--
-- ARREGLO:
--   Restringir UPDATE/DELETE a que el objeto sea del propio usuario
--   (storage.objects.owner = auth.uid(), que Storage rellena con el uid de
--   quien subió el archivo).
--
-- SIN RUPTURA:
--   - Todas las subidas usan una ruta con Date.now() (objeto nuevo cada vez),
--     así que en la práctica siempre son INSERT, nunca UPDATE. Restringir
--     UPDATE no afecta a ninguna subida existente.
--   - No hay ninguna llamada .remove() en el código: nada borra objetos de
--     otros, así que restringir DELETE tampoco rompe nada.
--   - service_role (usado por el servidor) ignora RLS, conserva acceso total.
-- =============================================================

-- Solo el dueño puede modificar su propio objeto.
drop policy if exists "receipts_update" on storage.objects;
create policy "receipts_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and owner = auth.uid())
  with check (bucket_id = 'receipts' and owner = auth.uid());

-- Solo el dueño puede borrar su propio objeto.
drop policy if exists "receipts_delete" on storage.objects;
create policy "receipts_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and owner = auth.uid());
