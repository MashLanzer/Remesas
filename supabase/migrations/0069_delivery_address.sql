-- Dirección exacta de entrega en Cuba. Antes el pedido del cliente solo tenía
-- provincia, así que el repartidor no sabía a qué casa ir. Ahora se captura en
-- el pedido y se guarda también en la libreta del cliente. (La tabla
-- beneficiaries ya tiene 'address' desde 0033; acceptOrder la alimentará.)
-- Idempotente.

alter table public.orders
  add column if not exists beneficiary_address text;

alter table public.client_saved_beneficiaries
  add column if not exists address text;

comment on column public.orders.beneficiary_address is
  'Dirección exacta de entrega en Cuba (calle, número, entre calles, municipio).';
