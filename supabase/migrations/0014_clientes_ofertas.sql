-- =============================================================
-- Giro — Fase 1 (lado Cliente): rol 'cliente' + ofertas + blindaje RLS
-- Ejecuta en el SQL Editor de Supabase. Idempotente.
-- =============================================================

-- ---------- 1) Permitir el rol 'cliente' ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role is null or role in ('operador', 'repartidor', 'cliente'));

-- ---------- 2) Funciones auxiliares ----------
-- El cliente también pertenece a su negocio (para ver ofertas y tasas).
create or replace function public.current_operator_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select case
    when p.role = 'operador' then p.id
    when p.role = 'repartidor' and p.member_status = 'active' then p.operator_id
    when p.role = 'cliente' then p.operator_id
    else null
  end
  from public.profiles p
  where p.id = auth.uid()
$$;

-- ¿Es personal del negocio (operador o repartidor activo)? El cliente NO lo es.
create or replace function public.current_is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select p.role = 'operador'
         or (p.role = 'repartidor' and p.member_status = 'active')
     from public.profiles p where p.id = auth.uid()),
    false)
$$;

-- Negocio por defecto (para asociar clientes; con registro de operador cerrado
-- hay uno solo).
create or replace function public.default_operator()
returns uuid
language sql stable security definer set search_path = public
as $$
  select p.id from public.profiles p
  where p.role = 'operador' order by p.created_at asc limit 1
$$;

-- Nombre del negocio del usuario actual (para el cliente, sin exponer el resto
-- de ajustes).
create or replace function public.my_business_name()
returns text
language sql stable security definer set search_path = public
as $$
  select bs.business_name from public.business_settings bs
  where bs.operator_id = public.current_operator_id() limit 1
$$;

grant execute on function public.current_is_staff() to authenticated;
grant execute on function public.default_operator() to authenticated;
grant execute on function public.my_business_name() to authenticated;

-- ---------- 3) Tabla de ofertas ----------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  title text not null,
  description text,
  kind text,
  emoji text,
  active boolean not null default true,
  starts_at date,
  ends_at date,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists offers_operator_idx
  on public.offers (operator_id, created_at desc);

alter table public.offers enable row level security;
drop policy if exists "offers_select" on public.offers;
create policy "offers_select" on public.offers
  for select using (operator_id = public.current_operator_id());
drop policy if exists "offers_write" on public.offers;
create policy "offers_write" on public.offers
  for all
  using (operator_id = public.current_operator_id() and public.current_is_operador())
  with check (operator_id = public.current_operator_id() and public.current_is_operador());

-- ---------- 4) Blindaje: el cliente NO puede ver la agenda ni escribir config ----------

-- clients y beneficiaries: solo personal del negocio (agenda privada).
drop policy if exists "clients_tenant" on public.clients;
create policy "clients_tenant" on public.clients
  for all
  using (operator_id = public.current_operator_id() and public.current_is_staff())
  with check (operator_id = public.current_operator_id() and public.current_is_staff());

drop policy if exists "beneficiaries_tenant" on public.beneficiaries;
create policy "beneficiaries_tenant" on public.beneficiaries
  for all
  using (operator_id = public.current_operator_id() and public.current_is_staff())
  with check (operator_id = public.current_operator_id() and public.current_is_staff());

-- exchange_rates y rate_history: el cliente LEE (para la calculadora); solo el
-- personal escribe.
drop policy if exists "exchange_rates_tenant" on public.exchange_rates;
drop policy if exists "exchange_rates_select" on public.exchange_rates;
drop policy if exists "exchange_rates_write" on public.exchange_rates;
create policy "exchange_rates_select" on public.exchange_rates
  for select using (operator_id = public.current_operator_id());
create policy "exchange_rates_write" on public.exchange_rates
  for all
  using (operator_id = public.current_operator_id() and public.current_is_staff())
  with check (operator_id = public.current_operator_id() and public.current_is_staff());

drop policy if exists "rate_history_tenant" on public.rate_history;
drop policy if exists "rate_history_select" on public.rate_history;
drop policy if exists "rate_history_write" on public.rate_history;
create policy "rate_history_select" on public.rate_history
  for select using (operator_id = public.current_operator_id());
create policy "rate_history_write" on public.rate_history
  for all
  using (operator_id = public.current_operator_id() and public.current_is_staff())
  with check (operator_id = public.current_operator_id() and public.current_is_staff());

-- business_settings: solo personal (el cliente no ve comisiones ni datos internos).
drop policy if exists "business_settings_tenant" on public.business_settings;
drop policy if exists "business_settings_select" on public.business_settings;
drop policy if exists "business_settings_write" on public.business_settings;
create policy "business_settings_select" on public.business_settings
  for select using (operator_id = public.current_operator_id() and public.current_is_staff());
create policy "business_settings_write" on public.business_settings
  for all
  using (operator_id = public.current_operator_id() and public.current_is_operador())
  with check (operator_id = public.current_operator_id() and public.current_is_operador());

-- remittances: crear solo el personal (el cliente no inserta remesas directo).
drop policy if exists "remittances_insert" on public.remittances;
create policy "remittances_insert" on public.remittances
  for insert
  with check (operator_id = public.current_operator_id() and public.current_is_staff());

-- settlements: escribir solo el personal.
drop policy if exists "settlements_write" on public.settlements;
create policy "settlements_write" on public.settlements
  for all
  using (operator_id = public.current_operator_id() and public.current_is_staff())
  with check (operator_id = public.current_operator_id() and public.current_is_staff());
