-- =============================================================
-- Giro — Fase 2: Pedidos (el cliente pide, el personal acepta)
-- Ejecuta después de la 0014. Idempotente.
-- =============================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  client_id uuid,               -- usuario cliente (profiles.id) que hizo el pedido
  client_name text,
  client_phone text,
  amount_usd numeric not null default 0,
  beneficiary_name text,
  beneficiary_phone text,
  province text,
  delivery_currency text,
  note text,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'aceptado', 'rechazado')),
  accepted_by uuid,             -- personal que aceptó/rechazó
  remittance_id uuid,           -- remesa generada al aceptar
  created_at timestamptz not null default now()
);
create index if not exists orders_operator_idx
  on public.orders (operator_id, created_at desc);
create index if not exists orders_client_idx
  on public.orders (client_id, created_at desc);

alter table public.orders enable row level security;

-- Ver: el personal ve los del negocio; el cliente ve solo los suyos.
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select using (
    (operator_id = public.current_operator_id() and public.current_is_staff())
    or client_id = auth.uid()
  );

-- Crear: solo el cliente crea pedidos a su propio nombre y en su negocio, y
-- siempre nacen 'pendiente' (no puede fijar estado/aceptado/remesa a mano).
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders
  for insert with check (
    operator_id = public.current_operator_id()
    and client_id = auth.uid()
    and status = 'pendiente'
    and accepted_by is null
    and remittance_id is null
  );

-- Aceptar/rechazar: solo el personal.
drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders
  for update
  using (operator_id = public.current_operator_id() and public.current_is_staff())
  with check (operator_id = public.current_operator_id() and public.current_is_staff());

-- Borrar: el personal cualquiera; el cliente puede cancelar los suyos pendientes.
drop policy if exists "orders_delete" on public.orders;
create policy "orders_delete" on public.orders
  for delete using (
    (operator_id = public.current_operator_id() and public.current_is_staff())
    or (client_id = auth.uid() and status = 'pendiente')
  );
