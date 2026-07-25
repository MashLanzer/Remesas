-- =============================================================
-- Giro — Gastos de reparto del repartidor (para su ganancia neta)
-- El repartidor registra lo que gasta en transporte, etc., y ve su ganancia
-- neta. Cada quien maneja los suyos; el operador ve los de su negocio.
-- Ejecuta después de 0033. Idempotente.
-- =============================================================

create table if not exists public.delivery_expenses (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  deliverer_id uuid not null references auth.users (id) on delete cascade,
  date date not null default (now() at time zone 'utc')::date,
  amount numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists delivery_expenses_op_idx
  on public.delivery_expenses (operator_id);
create index if not exists delivery_expenses_deliverer_idx
  on public.delivery_expenses (deliverer_id);

alter table public.delivery_expenses enable row level security;

drop policy if exists "delivery_expenses_select" on public.delivery_expenses;
drop policy if exists "delivery_expenses_write" on public.delivery_expenses;

-- El operador ve los gastos de su negocio; el repartidor solo los suyos.
create policy "delivery_expenses_select" on public.delivery_expenses
  for select using (
    operator_id = public.current_operator_id()
    and (public.current_is_operador() or deliverer_id = auth.uid())
  );

-- Cada quien registra/edita/borra sus propios gastos, dentro de su negocio.
create policy "delivery_expenses_write" on public.delivery_expenses
  for all using (
    operator_id = public.current_operator_id()
    and deliverer_id = auth.uid()
  )
  with check (
    operator_id = public.current_operator_id()
    and deliverer_id = auth.uid()
  );
