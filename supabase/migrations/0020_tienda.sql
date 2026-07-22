-- =============================================================
-- Giro — Fase 5: Tienda (combos / recargas)
-- El operador publica productos; el cliente los pide; el personal los gestiona.
-- Ejecuta después de 0019. Idempotente.
-- =============================================================

-- ---------- Productos ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  name text not null,
  description text,
  price_usd numeric not null default 0,
  category text,           -- 'recarga' | 'combo' | 'otro'
  emoji text,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists products_operator_idx
  on public.products (operator_id, created_at desc);

alter table public.products enable row level security;
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select using (operator_id = public.current_operator_id());
drop policy if exists "products_write" on public.products;
create policy "products_write" on public.products
  for all
  using (operator_id = public.current_operator_id() and public.current_is_operador())
  with check (operator_id = public.current_operator_id() and public.current_is_operador());

-- ---------- Pedidos de tienda ----------
create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  client_id uuid,
  client_name text,
  client_phone text,
  product_id uuid,
  product_name text,
  price_usd numeric not null default 0,
  qty integer not null default 1,
  total_usd numeric not null default 0,
  recipient_name text,
  recipient_phone text,
  address text,
  note text,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'aceptado', 'rechazado')),
  accepted_by uuid,
  accepted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists store_orders_operator_idx
  on public.store_orders (operator_id, created_at desc);
create index if not exists store_orders_client_idx
  on public.store_orders (client_id, created_at desc);

alter table public.store_orders enable row level security;

drop policy if exists "store_orders_select" on public.store_orders;
create policy "store_orders_select" on public.store_orders
  for select using (
    (operator_id = public.current_operator_id() and public.current_is_staff())
    or client_id = auth.uid()
  );

drop policy if exists "store_orders_insert" on public.store_orders;
create policy "store_orders_insert" on public.store_orders
  for insert with check (
    operator_id = public.current_operator_id()
    and client_id = auth.uid()
    and status = 'pendiente'
    and accepted_by is null
    and accepted_at is null
    and delivered_at is null
  );

drop policy if exists "store_orders_update" on public.store_orders;
create policy "store_orders_update" on public.store_orders
  for update
  using (operator_id = public.current_operator_id() and public.current_is_staff())
  with check (operator_id = public.current_operator_id() and public.current_is_staff());

drop policy if exists "store_orders_delete" on public.store_orders;
create policy "store_orders_delete" on public.store_orders
  for delete using (
    (operator_id = public.current_operator_id() and public.current_is_staff())
    or (client_id = auth.uid() and status = 'pendiente')
  );

-- Blindaje del precio: el nombre/precio/total SIEMPRE se toman del producto real
-- (mismo negocio, activo), no de lo que mande el cliente. Cierra el "combo de
-- $100 por $0" vía inserción directa por API.
create or replace function public.store_orders_price_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare pr public.products;
begin
  select * into pr from public.products
   where id = new.product_id and operator_id = new.operator_id;
  if not found or pr.active = false then
    raise exception 'Producto inválido o inactivo';
  end if;
  new.product_name := pr.name;
  new.price_usd    := pr.price_usd;
  new.qty          := greatest(1, coalesce(new.qty, 1));
  new.total_usd    := round(pr.price_usd * new.qty, 2);
  return new;
end $$;
drop trigger if exists store_orders_price_guard_bi on public.store_orders;
create trigger store_orders_price_guard_bi
  before insert on public.store_orders
  for each row execute function public.store_orders_price_guard();
