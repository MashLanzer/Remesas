-- Ubicación en vivo del repartidor durante la entrega, por remesa. La escribe
-- el personal del negocio (el repartidor) desde su dispositivo; la lee el
-- cliente dueño del pedido vinculado (o el personal). Acceso SOLO por funciones
-- SECURITY DEFINER; la tabla tiene RLS activa sin políticas. Idempotente.

create table if not exists public.delivery_locations (
  remittance_id uuid primary key references public.remittances (id) on delete cascade,
  operator_id uuid not null,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  updated_at timestamptz not null default now()
);

alter table public.delivery_locations enable row level security;
-- Sin políticas: acceso directo denegado; todo va por las funciones.

-- El personal (repartidor) actualiza su posición para una remesa suya.
create or replace function public.update_delivery_location(
  p_remittance uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.remittances%rowtype;
  op uuid;
begin
  select * into r from public.remittances where id = p_remittance;
  if r.id is null then return; end if;
  op := public.current_operator_id();
  if not (public.current_is_staff() and r.operator_id = op) then
    return;
  end if;
  insert into public.delivery_locations (remittance_id, operator_id, lat, lng, accuracy, updated_at)
  values (p_remittance, r.operator_id, p_lat, p_lng, p_accuracy, now())
  on conflict (remittance_id) do update
    set lat = excluded.lat,
        lng = excluded.lng,
        accuracy = excluded.accuracy,
        updated_at = now();
end
$$;

-- Lee la última posición: el cliente dueño del pedido vinculado, o el personal.
create or replace function public.get_delivery_location(p_remittance uuid)
returns table (lat double precision, lng double precision, accuracy double precision, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.remittances%rowtype;
  op uuid;
  allowed boolean;
begin
  select * into r from public.remittances where id = p_remittance;
  if r.id is null then return; end if;
  op := public.current_operator_id();
  allowed := (public.current_is_staff() and r.operator_id = op)
    or exists (
      select 1 from public.orders o
      where o.remittance_id = p_remittance and o.client_id = auth.uid()
    );
  if not allowed then return; end if;
  return query
    select d.lat, d.lng, d.accuracy, d.updated_at
    from public.delivery_locations d
    where d.remittance_id = p_remittance;
end
$$;

grant execute on function public.update_delivery_location(uuid, double precision, double precision, double precision) to authenticated;
grant execute on function public.get_delivery_location(uuid) to authenticated;
revoke execute on function public.update_delivery_location(uuid, double precision, double precision, double precision) from public, anon;
revoke execute on function public.get_delivery_location(uuid) from public, anon;
