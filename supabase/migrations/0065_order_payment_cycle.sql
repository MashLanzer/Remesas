-- Cierre del ciclo de pago del cliente sobre su pedido:
--   Por pagar  -> aún no pagó (o el negocio no lo ha confirmado)
--   Informado  -> el cliente tocó "Ya pagué" (queda registrado, no solo WhatsApp)
--   Pagado     -> el negocio confirmó el cobro (client_paid en la remesa)
-- La confirmación real sigue en manos del negocio (remittances.client_paid, que
-- ya alterna con "Cobrado/Por cobrar"); aquí solo se refleja al cliente y se le
-- deja informar. Idempotente.

alter table public.orders
  add column if not exists client_marked_paid_at timestamptz;

comment on column public.orders.client_marked_paid_at is
  'Momento en que el cliente informó "ya pagué" (a confirmar por el negocio).';

-- Estado de pago del pedido del propio cliente (RLS-safe).
create or replace function public.my_order_payment(p_order uuid)
returns table (marked_paid_at timestamptz, confirmed boolean)
language sql
stable
security definer
set search_path = public
as $$
  select o.client_marked_paid_at,
         coalesce(r.client_paid, false) as confirmed
  from public.orders o
  left join public.remittances r on r.id = o.remittance_id
  where o.id = p_order and o.client_id = auth.uid()
  limit 1
$$;

-- El cliente informa que ya pagó su propio pedido. No confirma el cobro (eso lo
-- hace el negocio); solo deja constancia con marca de tiempo, una sola vez.
create or replace function public.client_mark_order_paid(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set client_marked_paid_at = coalesce(client_marked_paid_at, now())
   where id = p_order and client_id = auth.uid();
end
$$;

grant execute on function public.my_order_payment(uuid) to authenticated;
grant execute on function public.client_mark_order_paid(uuid) to authenticated;
revoke execute on function public.my_order_payment(uuid) from public, anon;
revoke execute on function public.client_mark_order_paid(uuid) from public, anon;
