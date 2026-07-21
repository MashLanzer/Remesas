-- =============================================================
-- Giro — Fase 1: multi-negocio (operador/repartidor por equipo) + log
-- Cada operador es un "negocio" aislado. Ejecuta en el SQL Editor de Supabase.
-- =============================================================

-- ---------- 1) Perfiles: rol opcional (onboarding), tenant, código, estado ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role drop not null;
alter table public.profiles add constraint profiles_role_check
  check (role is null or role in ('operador', 'repartidor'));

alter table public.profiles add column if not exists operator_id uuid references public.profiles (id);
alter table public.profiles add column if not exists operator_code text;
alter table public.profiles add column if not exists member_status text; -- 'active' | 'pending'

create unique index if not exists profiles_operator_code_idx
  on public.profiles (operator_code) where operator_code is not null;

-- ---------- 2) operator_id (dueño/tenant) en todas las tablas de datos ----------
alter table public.remittances add column if not exists operator_id uuid;
alter table public.clients add column if not exists operator_id uuid;
alter table public.beneficiaries add column if not exists operator_id uuid;
alter table public.settlements add column if not exists operator_id uuid;
alter table public.rate_history add column if not exists operator_id uuid;
alter table public.exchange_rates add column if not exists operator_id uuid;
alter table public.business_settings add column if not exists operator_id uuid;

create index if not exists remittances_operator_idx on public.remittances (operator_id);
create index if not exists clients_operator_idx on public.clients (operator_id);
create index if not exists beneficiaries_operator_idx on public.beneficiaries (operator_id);
create index if not exists settlements_operator_idx on public.settlements (operator_id);

-- ---------- 3) Log de actividad ----------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid,
  actor_id uuid,
  actor_name text,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id uuid,
  entity_label text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_operator_idx on public.activity_log (operator_id, created_at desc);
create index if not exists activity_log_actor_idx on public.activity_log (actor_id, created_at desc);

alter table public.activity_log enable row level security;
drop policy if exists "activity_log_all" on public.activity_log;
create policy "activity_log_all" on public.activity_log
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------- 4) business_settings y exchange_rates: una fila por operador ----------
-- business_settings dejaba una sola fila (id=true). Ahora una por operador.
alter table public.business_settings drop constraint if exists business_settings_pkey;
alter table public.business_settings drop constraint if exists business_settings_single_row;
alter table public.business_settings alter column id drop not null;
create unique index if not exists business_settings_operator_idx
  on public.business_settings (operator_id);

-- exchange_rates era único por moneda global. Ahora único por (operador, moneda).
alter table public.exchange_rates drop constraint if exists exchange_rates_currency_key;
create unique index if not exists exchange_rates_operator_currency_idx
  on public.exchange_rates (operator_id, currency);

-- ---------- 5) Bootstrap del operador dueño + backfill de sus datos ----------
do $$
declare owner_id uuid;
begin
  select p.id into owner_id
    from public.profiles p
    join auth.users u on u.id = p.id
    where u.email = 'brayanibarra0105@gmail.com'
    limit 1;

  if owner_id is not null then
    update public.profiles
      set role = 'operador',
          operator_id = owner_id,
          member_status = 'active',
          operator_code = coalesce(operator_code, upper(substr(md5(random()::text), 1, 6)))
      where id = owner_id;

    -- Perfiles ya existentes (pruebas): repartidores de este operador, activos.
    update public.profiles
      set operator_id = owner_id, member_status = 'active'
      where id <> owner_id and operator_id is null;

    update public.remittances set operator_id = owner_id where operator_id is null;
    update public.clients set operator_id = owner_id where operator_id is null;
    update public.beneficiaries set operator_id = owner_id where operator_id is null;
    update public.settlements set operator_id = owner_id where operator_id is null;
    update public.rate_history set operator_id = owner_id where operator_id is null;
    update public.exchange_rates set operator_id = owner_id where operator_id is null;
    update public.business_settings set operator_id = owner_id where operator_id is null;
  end if;
end $$;
