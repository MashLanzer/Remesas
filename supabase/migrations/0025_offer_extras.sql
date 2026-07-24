-- =============================================================
-- Giro — Extras de promociones: destacada + contador de vistas
-- Ejecuta después de 0024. Idempotente.
-- =============================================================

alter table public.offers add column if not exists featured boolean not null default false;
alter table public.offers add column if not exists view_count integer not null default 0;

-- Incrementa las vistas de una promoción del operador del usuario actual.
-- SECURITY DEFINER: el cliente no tiene UPDATE sobre offers vía RLS.
create or replace function public.bump_offer_view(p_offer uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.offers
  set view_count = coalesce(view_count, 0) + 1
  where id = p_offer
    and operator_id = (select operator_id from public.profiles where id = auth.uid());
$$;

grant execute on function public.bump_offer_view(uuid) to authenticated;
