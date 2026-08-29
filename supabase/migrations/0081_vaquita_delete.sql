-- =============================================================
-- Vaquitas — permitir que el organizador borre su propia vaquita
-- Ejecuta este archivo en el SQL Editor de Supabase.
--
-- La vaquita no tenía política de DELETE, así que la RLS bloqueaba borrarla.
-- Añadimos una: el organizador puede borrar SU vaquita mientras no se haya
-- convertido en pedido (order_id is null). Los aportes se borran en cascada
-- (vaquita_contributions.vaquita_id ... on delete cascade, migración 0074).
-- =============================================================

drop policy if exists "vaquitas_delete" on public.vaquitas;
create policy "vaquitas_delete" on public.vaquitas
  for delete using (
    organizer_client_id = auth.uid() and order_id is null
  );
