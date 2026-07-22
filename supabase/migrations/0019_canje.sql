-- =============================================================
-- Giro — Fase 4b: canje de puntos (con la economía a favor de la casa)
-- El descuento por puntos se topa a un % de la comisión del pedido, así el
-- negocio siempre conserva la mayor parte. Ejecuta después de 0018. Idempotente.
-- =============================================================

-- Config del canje (por negocio).
alter table public.business_settings
  add column if not exists point_value_usd numeric default 0.05;   -- 100 pts = $5
alter table public.business_settings
  add column if not exists redeem_min_points integer default 100;   -- mínimo para canjear
alter table public.business_settings
  add column if not exists redeem_max_pct numeric default 50;       -- tope: % de la comisión

-- Reserva atómica de puntos para el canje. Con lock por cliente evita el
-- "double-spend": si el cliente canjea en dos pedidos a la vez, el segundo ve
-- el saldo ya descontado y no vuelve a descontar. Redondea a la baja (nunca pasa
-- el tope ni deja el saldo negativo). Solo la llama el personal desde acceptOrder.
create or replace function public.redeem_points(
  p_client uuid,
  p_order uuid,
  p_commission numeric,
  p_point_value numeric,
  p_min_points integer,
  p_max_pct numeric
)
returns table (points_used integer, discount numeric)
language plpgsql security definer set search_path = public as $$
declare
  bal integer;
  maxcap numeric;
  pts integer;
begin
  if not public.current_is_staff() then
    return query select 0, 0::numeric; return;
  end if;
  perform pg_advisory_xact_lock(hashtext(p_client::text));
  select coalesce(sum(delta), 0) into bal
    from public.points_ledger where client_id = p_client;
  maxcap := p_commission * (p_max_pct / 100.0);
  if bal < p_min_points or p_point_value <= 0 or maxcap <= 0 then
    return query select 0, 0::numeric; return;
  end if;
  pts := least(bal, floor(maxcap / p_point_value));
  if pts <= 0 then
    return query select 0, 0::numeric; return;
  end if;
  insert into public.points_ledger (operator_id, client_id, delta, reason, order_id)
    values (public.current_operator_id(), p_client, -pts, 'canje', p_order);
  return query select pts, least(round(pts * p_point_value, 2), p_commission);
end $$;
grant execute on function
  public.redeem_points(uuid, uuid, numeric, numeric, integer, numeric)
  to authenticated;

-- Config visible para el cliente (marca + puntos), sin exponer comisiones.
create or replace function public.my_client_config()
returns table (
  business_name text,
  points_per_usd numeric,
  point_value_usd numeric,
  redeem_min_points integer
)
language sql stable security definer set search_path = public as $$
  select b.business_name, b.points_per_usd, b.point_value_usd, b.redeem_min_points
  from public.business_settings b
  where b.operator_id = public.current_operator_id()
  limit 1
$$;
grant execute on function public.my_client_config() to authenticated;
revoke execute on function public.my_client_config() from public, anon;

-- Canje en el pedido.
alter table public.orders add column if not exists redeem boolean default false;
alter table public.orders add column if not exists points_used integer;
alter table public.orders add column if not exists discount_usd numeric;

-- Re-endurecer el insert del cliente: el descuento/puntos usados los pone el
-- personal al aceptar, no el cliente (redeem sí lo puede pedir).
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders
  for insert with check (
    operator_id = public.current_operator_id()
    and client_id = auth.uid()
    and status = 'pendiente'
    and accepted_by is null
    and remittance_id is null
    and accepted_at is null
    and delivered_at is null
    and received_at is null
    and points_used is null
    and discount_usd is null
  );
