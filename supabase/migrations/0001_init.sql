-- =============================================================
-- Remesas — esquema inicial
-- Ejecuta este archivo en el SQL Editor de Supabase (o con la CLI).
-- =============================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- profiles: un registro por usuario autenticado (socios).
-- Se enlaza con auth.users. Se crea automáticamente al registrarse.
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'socio' check (role in ('socio', 'admin')),
  default_split_percent numeric(5, 2) not null default 50,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- clients: remitentes (quien paga en EE.UU.)
-- -------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  country text,
  notes text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- beneficiaries: destinatarios (familia en Cuba)
-- -------------------------------------------------------------
create table if not exists public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  province text,
  preferred_currency text check (preferred_currency in ('CUP', 'USD', 'MLC', 'EUR')),
  id_card text,
  notes text,
  client_id uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- exchange_rates: tasa actual por moneda (pre-rellena las remesas)
-- -------------------------------------------------------------
create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  currency text not null unique check (currency in ('CUP', 'USD', 'MLC', 'EUR')),
  rate numeric(14, 4) not null default 1,
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- remittances: el registro central
-- -------------------------------------------------------------
create table if not exists public.remittances (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  client_id uuid references public.clients (id) on delete set null,
  beneficiary_id uuid references public.beneficiaries (id) on delete set null,
  amount_usd numeric(12, 2) not null default 0,
  commission numeric(12, 2) not null default 0,
  total_received numeric(12, 2) not null default 0,
  payment_method text,
  delivery_currency text not null default 'CUP' check (delivery_currency in ('CUP', 'USD', 'MLC', 'EUR')),
  exchange_rate numeric(14, 4) not null default 1,
  local_amount numeric(16, 2) not null default 0,
  exchange_profit numeric(12, 2) not null default 0,
  total_profit numeric(12, 2) not null default 0,
  my_split_percent numeric(5, 2) not null default 50,
  my_share numeric(12, 2) not null default 0,
  partner_share numeric(12, 2) not null default 0,
  status text not null default 'pendiente' check (status in ('pendiente', 'entregado', 'liquidado')),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists remittances_date_idx on public.remittances (date desc);
create index if not exists remittances_status_idx on public.remittances (status);

-- -------------------------------------------------------------
-- settlements: liquidaciones entre socios
-- -------------------------------------------------------------
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  amount numeric(12, 2) not null default 0,
  direction text not null default 'us_to_cuba' check (direction in ('us_to_cuba', 'cuba_to_us')),
  method text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- =============================================================
-- Trigger: crear profile automáticamente al registrarse un usuario
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- Row Level Security
-- Es una app privada para los socios: cualquier usuario autenticado
-- puede leer y escribir. (Se puede endurecer más adelante.)
-- =============================================================
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.remittances enable row level security;
alter table public.settlements enable row level security;

-- profiles: cada quien ve/edita su perfil; todos los autenticados pueden leer.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Resto de tablas: acceso total para usuarios autenticados.
do $$
declare
  t text;
begin
  foreach t in array array['clients', 'beneficiaries', 'exchange_rates', 'remittances', 'settlements']
  loop
    execute format('drop policy if exists "%s_all" on public.%I;', t, t);
    execute format(
      'create policy "%s_all" on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');',
      t, t
    );
  end loop;
end $$;

-- =============================================================
-- Datos iniciales: tasas de cambio base (ajústalas al mercado)
-- =============================================================
insert into public.exchange_rates (currency, rate)
values ('CUP', 440), ('USD', 1), ('MLC', 1), ('EUR', 0.92)
on conflict (currency) do nothing;
