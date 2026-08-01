-- Paquetes con precio FIJO ("sin sorpresas"), además del modo automático.
--
-- En modo 'fixed' el operador define a mano los tres números y ESO manda, sin
-- aplicar comisión ni recalcular por tasa:
--   amount_usd      = lo que paga el cliente en total (ya existente, se reutiliza).
--   fixed_send_usd  = lo que realmente se envía/entrega en USD (delivered).
--   fixed_receives  = lo que llega a la familia en la moneda de entrega.
-- La comisión queda implícita = amount_usd - fixed_send_usd (tu ganancia).
-- En modo 'auto' (por defecto) sigue todo igual: se cobra la comisión normal.

alter table public.remittance_packages add column if not exists pricing_mode text not null default 'auto';
alter table public.remittance_packages add column if not exists fixed_send_usd numeric;
alter table public.remittance_packages add column if not exists fixed_receives numeric;
