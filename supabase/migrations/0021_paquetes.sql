-- =============================================================
-- Giro — Paquetes de remesa (remittance packages)
-- El operador publica paquetes preconfigurados; el cliente los pide y entran al
-- pipeline normal de pedidos (orders) → remesa → seguimiento → puntos.
-- Ejecuta después de 0020. Idempotente.
-- =============================================================

create table if not exists public.remittance_packages (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  title text not null,
  description text,
  emoji text,
  amount_usd numeric not null default 0,
  delivery_currency text,
  highlight text,
  active boolean not null default true,
  sort integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists remittance_packages_operator_idx
  on public.remittance_packages (operator_id, sort, created_at desc);

alter table public.remittance_packages enable row level security;
drop policy if exists "remittance_packages_select" on public.remittance_packages;
create policy "remittance_packages_select" on public.remittance_packages
  for select using (
    operator_id = public.current_operator_id()
    and (active or public.current_is_operador())
  );
drop policy if exists "remittance_packages_write" on public.remittance_packages;
create policy "remittance_packages_write" on public.remittance_packages
  for all
  using (operator_id = public.current_operator_id() and public.current_is_operador())
  with check (operator_id = public.current_operator_id() and public.current_is_operador());

-- Vincular pedidos a un paquete (opcional).
alter table public.orders add column if not exists package_id uuid;

-- Blindaje: si un pedido viene de un paquete, el monto y la moneda SIEMPRE se
-- toman del paquete real (mismo negocio, activo), no de lo que mande el cliente.
create or replace function public.orders_package_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare pk public.remittance_packages;
begin
  if new.package_id is null then
    return new;
  end if;
  select * into pk from public.remittance_packages
   where id = new.package_id and operator_id = new.operator_id;
  if not found or pk.active = false then
    raise exception 'Paquete inválido o inactivo';
  end if;
  new.amount_usd := pk.amount_usd;
  if pk.delivery_currency is not null then
    new.delivery_currency := pk.delivery_currency;
  end if;
  return new;
end $$;
drop trigger if exists orders_package_guard_bi on public.orders;
create trigger orders_package_guard_bi
  before insert on public.orders
  for each row execute function public.orders_package_guard();
