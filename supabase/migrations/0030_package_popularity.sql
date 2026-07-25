-- =============================================================
-- Giro — Popularidad de paquetes para el cliente (RLS-safe)
-- Cuenta cuántos pedidos ha recibido cada paquete del operador del cliente,
-- para ordenar la tienda por "los más pedidos primero". SECURITY DEFINER
-- porque el cliente no tiene SELECT sobre los pedidos de otros clientes.
-- Ejecuta después de 0029. Idempotente.
-- =============================================================

create or replace function public.package_popularity()
returns table (package_id uuid, order_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select o.package_id, count(*)::bigint as order_count
  from public.profiles me
  join public.orders o on o.operator_id = me.operator_id
  where me.id = auth.uid()
    and o.package_id is not null
  group by o.package_id
$$;

grant execute on function public.package_popularity() to authenticated;
revoke execute on function public.package_popularity() from public, anon;
