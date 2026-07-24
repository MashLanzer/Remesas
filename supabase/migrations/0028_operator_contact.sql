-- =============================================================
-- Giro — Contacto del negocio para el cliente (RLS-safe)
-- Devuelve el nombre del negocio y el WhatsApp del operador al cliente,
-- resolviendo su operador por profiles.operator_id. SECURITY DEFINER porque
-- el cliente no tiene SELECT directo sobre el perfil del operador.
-- Ejecuta después de 0027. Idempotente.
-- =============================================================

create or replace function public.my_operator_contact()
returns table (business_name text, phone text)
language sql
stable
security definer
set search_path = public
as $$
  select b.business_name, p.phone
  from public.profiles me
  join public.profiles p on p.id = me.operator_id
  left join public.business_settings b on b.operator_id = me.operator_id
  where me.id = auth.uid()
  limit 1
$$;

grant execute on function public.my_operator_contact() to authenticated;
revoke execute on function public.my_operator_contact() from public, anon;
