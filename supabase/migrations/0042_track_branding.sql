-- =============================================================
-- Giro — Seguimiento público con marca y contacto del negocio
-- Amplía track_get para devolver el WhatsApp del negocio y su color de marca,
-- para que la página que ve la familia (sin login) lleve la identidad del
-- operador y un botón de contacto. Cambia el tipo de retorno → se hace drop.
-- Ejecuta después de 0041. Idempotente.
-- =============================================================

drop function if exists public.track_get(text);

create function public.track_get(p_token text)
returns table (
  beneficiary_name text,
  amount_usd numeric,
  local_amount numeric,
  delivery_currency text,
  status text,
  created_at timestamptz,
  accepted_at timestamptz,
  delivered_at timestamptz,
  received_at timestamptz,
  business_name text,
  business_phone text,
  brand_hue integer
)
language sql stable security definer set search_path = public as $$
  select o.beneficiary_name, o.amount_usd,
         (select r.local_amount from public.remittances r
           where r.id = o.remittance_id) as local_amount,
         o.delivery_currency, o.status,
         o.created_at, o.accepted_at, o.delivered_at, o.received_at,
         (select b.business_name from public.business_settings b
           where b.operator_id = o.operator_id limit 1),
         (select p.phone from public.profiles p
           where p.id = o.operator_id limit 1),
         (select b.brand_hue from public.business_settings b
           where b.operator_id = o.operator_id limit 1)
  from public.orders o
  where o.track_token = p_token
  limit 1
$$;

grant execute on function public.track_get(text) to anon, authenticated;
revoke execute on function public.track_get(text) from public;
