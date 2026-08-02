-- El cliente puede elegir CÓMO recibe su familia (moneda + forma), incluso en
-- pedidos que vienen de un paquete. El PRECIO (amount_usd) sigue blindado al
-- paquete; lo único que se abre es la moneda de entrega: si el cliente mandó
-- una, se respeta; si no, cae a la del paquete (comportamiento anterior).

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
  -- El monto SIEMPRE manda el paquete (es el precio que se paga).
  new.amount_usd := pk.amount_usd;
  -- La moneda de entrega: la que eligió el cliente; si no eligió, la del paquete.
  if new.delivery_currency is null then
    new.delivery_currency := pk.delivery_currency;
  end if;
  return new;
end $$;
