-- El cliente necesita ver CÓMO pagarle al negocio después de hacer un pedido.
-- Los métodos de cobro (Zelle/CashApp/PayPal) viven en el perfil del operador
-- (0010). Esta función RLS-safe los expone SOLO al cliente de ese negocio,
-- junto al nombre y WhatsApp, sin abrir el perfil completo del operador.

drop function if exists public.my_operator_payment();
create or replace function public.my_operator_payment()
returns table (
  business_name text,
  phone text,
  zelle text,
  cashapp text,
  paypal text
)
language sql
stable
security definer
set search_path = public
as $$
  select b.business_name, p.phone, p.zelle, p.cashapp, p.paypal
  from public.profiles me
  join public.profiles p on p.id = me.operator_id
  left join public.business_settings b on b.operator_id = me.operator_id
  where me.id = auth.uid()
  limit 1
$$;

grant execute on function public.my_operator_payment() to authenticated;
revoke execute on function public.my_operator_payment() from public, anon;
