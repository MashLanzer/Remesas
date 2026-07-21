-- =============================================================
-- Giro — Roles: operador (dueño) y repartidor (persona en Cuba)
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- =============================================================

-- Rol de cada usuario. Por defecto 'repartidor' (acceso limitado a lo suyo).
alter table public.profiles
  add column if not exists role text not null default 'repartidor';

-- A qué repartidor está asignada cada remesa / cada pago.
alter table public.remittances
  add column if not exists deliverer_id uuid references public.profiles (id);
alter table public.settlements
  add column if not exists deliverer_id uuid references public.profiles (id);

create index if not exists remittances_deliverer_idx
  on public.remittances (deliverer_id);
create index if not exists settlements_deliverer_idx
  on public.settlements (deliverer_id);

-- Bootstrap: el dueño de la app queda como operador (ve todo).
update public.profiles p
  set role = 'operador'
  from auth.users u
  where p.id = u.id and u.email = 'brayanibarra0105@gmail.com';
