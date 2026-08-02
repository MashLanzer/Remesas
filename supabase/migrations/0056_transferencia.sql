-- Nuevo sistema de entrega: la familia puede recibir el mismo envío de varias
-- formas. Para CUP existe además de EFECTIVO la variante TRANSFERENCIA, que en
-- la calle vale más: transferencia = efectivo + un % (por defecto 10%).
--
-- Ej. (envío entregado $100, tasa 650):
--   efectivo      = 100 * 650            = 65,000 CUP
--   transferencia = 65,000 * (1 + 10/100) = 71,500 CUP
--
-- El % lo configura el operador (business_settings.transfer_bonus_pct) y aplica
-- SOLO a CUP. En cada pedido/remesa se guarda con qué forma se entregó.
-- Tolerante: si estas columnas no existen, la app sigue funcionando en efectivo.

-- 1) % extra de la transferencia (config del negocio, un solo número global).
alter table public.business_settings
  add column if not exists transfer_bonus_pct numeric(6, 2) not null default 10;

-- 2) Forma de entrega en la remesa (registro central). null = efectivo (legado).
alter table public.remittances
  add column if not exists delivery_method text
    check (delivery_method is null or delivery_method in ('efectivo', 'transferencia'));

-- 3) Forma de entrega que eligió el cliente al hacer el pedido.
alter table public.orders
  add column if not exists delivery_method text
    check (delivery_method is null or delivery_method in ('efectivo', 'transferencia'));
