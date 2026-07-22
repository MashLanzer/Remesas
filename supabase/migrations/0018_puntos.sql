-- =============================================================
-- Giro — Fase 4a: puntos de fidelidad (ganar + ver)
-- El cliente gana puntos cuando su remesa se entrega. Ejecuta después de 0017.
-- Idempotente.
-- =============================================================

-- Cuántos puntos por cada USD enviado (configurable por el operador).
alter table public.business_settings
  add column if not exists points_per_usd numeric default 1;

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  client_id uuid not null,      -- usuario cliente (profiles.id)
  delta integer not null,       -- +ganados / -canjeados
  reason text,                  -- 'remesa' | 'canje' | 'ajuste'
  order_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists points_ledger_client_idx
  on public.points_ledger (client_id, created_at desc);
create index if not exists points_ledger_operator_idx
  on public.points_ledger (operator_id, created_at desc);
-- Evita premiar dos veces el mismo pedido por la misma razón.
create unique index if not exists points_ledger_order_reason_idx
  on public.points_ledger (order_id, reason) where order_id is not null;

alter table public.points_ledger enable row level security;

-- Ver: el cliente ve los suyos; el personal, los del negocio.
drop policy if exists "points_select" on public.points_ledger;
create policy "points_select" on public.points_ledger
  for select using (
    client_id = auth.uid()
    or (operator_id = public.current_operator_id() and public.current_is_staff())
  );

-- Escribir: solo el personal del negocio (ganar/canjear/ajustar).
drop policy if exists "points_write" on public.points_ledger;
create policy "points_write" on public.points_ledger
  for all
  using (operator_id = public.current_operator_id() and public.current_is_staff())
  with check (operator_id = public.current_operator_id() and public.current_is_staff());
