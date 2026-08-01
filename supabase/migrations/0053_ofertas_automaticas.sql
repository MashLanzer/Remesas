-- Ofertas con efecto automático en el precio, con candados.
--
-- Hasta ahora las ofertas eran solo carteles. Estas columnas permiten que una
-- oferta APLIQUE sola un descuento (o mejor tasa) al registrar la remesa, con
-- límites para no perder dinero:
--   auto_apply       = si esta oferta cambia el precio automáticamente.
--   new_clients_only = solo aplica al primer envío de un cliente nuevo (candado).
--   discount_kind    = 'comision_cero' | 'comision_pct' | 'comision_flat' | 'tasa_bonus'
--   discount_value   = el número (20 = -20%, 1 = -$1, 2 = +2 de tasa/USD).
--   min_amount_usd   = monto mínimo del envío para que aplique (0 = sin mínimo).
-- La ventana de fechas reutiliza starts_at / ends_at (ya existentes).
-- La comisión nunca queda negativa (se topa en 0 al aplicar).

alter table public.offers add column if not exists auto_apply boolean not null default false;
alter table public.offers add column if not exists new_clients_only boolean not null default true;
alter table public.offers add column if not exists discount_kind text;
alter table public.offers add column if not exists discount_value numeric not null default 0;
alter table public.offers add column if not exists min_amount_usd numeric not null default 0;
