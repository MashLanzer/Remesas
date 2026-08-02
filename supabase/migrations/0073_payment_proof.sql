-- =============================================================
-- Giro — Comprobante de pago del cliente en su pedido
-- El cliente adjunta la captura de su pago (Zelle/CashApp/…) al pedido. El
-- operador la ve para confirmar el cobro más rápido. Subir el comprobante marca
-- también "ya pagué". Ejecuta después de 0072. Idempotente.
-- =============================================================

alter table public.orders
  add column if not exists payment_proof_url text;

comment on column public.orders.payment_proof_url is
  'URL de la captura del pago que subió el cliente (a confirmar por el negocio).';

-- Estado de pago del propio cliente, ahora con la URL del comprobante.
create or replace function public.my_order_payment(p_order uuid)
returns table (marked_paid_at timestamptz, confirmed boolean, proof_url text)
language sql
stable
security definer
set search_path = public
as $$
  select o.client_marked_paid_at,
         coalesce(r.client_paid, false) as confirmed,
         o.payment_proof_url
  from public.orders o
  left join public.remittances r on r.id = o.remittance_id
  where o.id = p_order and o.client_id = auth.uid()
  limit 1
$$;

-- El cliente guarda la URL de su comprobante en su propio pedido y queda como
-- "informado" (no confirma el cobro; eso lo hace el negocio).
create or replace function public.client_set_payment_proof(p_order uuid, p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set payment_proof_url = p_url,
         client_marked_paid_at = coalesce(client_marked_paid_at, now())
   where id = p_order and client_id = auth.uid();
end
$$;

grant execute on function public.my_order_payment(uuid) to authenticated;
grant execute on function public.client_set_payment_proof(uuid, text) to authenticated;
revoke execute on function public.client_set_payment_proof(uuid, text) from public, anon;
