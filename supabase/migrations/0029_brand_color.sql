-- =============================================================
-- Giro — Color de marca del negocio (tono) para la app del cliente
-- brand_hue: 0-360; vacío = verde por defecto. Se aplica al acento (--primary)
-- de la app del cliente. Ejecuta después de 0028. Idempotente.
-- =============================================================

alter table public.business_settings add column if not exists brand_hue integer;

-- El cliente necesita leer el tono; lo devolvemos junto al contacto (RLS-safe).
-- Cambia el tipo de retorno (añade brand_hue), por eso hay que soltarla antes.
drop function if exists public.my_operator_contact();
create or replace function public.my_operator_contact()
returns table (business_name text, phone text, brand_hue integer)
language sql
stable
security definer
set search_path = public
as $$
  select b.business_name, p.phone, b.brand_hue
  from public.profiles me
  join public.profiles p on p.id = me.operator_id
  left join public.business_settings b on b.operator_id = me.operator_id
  where me.id = auth.uid()
  limit 1
$$;

grant execute on function public.my_operator_contact() to authenticated;
revoke execute on function public.my_operator_contact() from public, anon;
