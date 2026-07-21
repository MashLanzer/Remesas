-- =============================================================
-- Giro — Roles: operador (dueño) y repartidor (persona en Cuba)
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- =============================================================

-- La tabla profiles traía un CHECK viejo (role in 'socio'/'admin'). Lo quitamos.
alter table public.profiles drop constraint if exists profiles_role_check;

-- Aseguramos la columna y el nuevo valor por defecto.
alter table public.profiles add column if not exists role text;
alter table public.profiles alter column role set default 'repartidor';

-- Convertimos cualquier valor viejo a los nuevos roles.
update public.profiles set role = 'repartidor'
  where role is null or role not in ('operador', 'repartidor');

alter table public.profiles alter column role set not null;

-- Nuevo CHECK con los roles correctos.
alter table public.profiles add constraint profiles_role_check
  check (role in ('operador', 'repartidor'));

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
