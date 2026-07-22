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
