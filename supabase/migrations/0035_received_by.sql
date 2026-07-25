-- =============================================================
-- Giro — "Recibido por" en la entrega (prueba más sólida)
-- Al entregar, el repartidor puede registrar quién recibió (nombre y carné),
-- además de la foto de comprobante. Tolerante si las columnas no existen.
-- Ejecuta después de 0034. Idempotente.
-- =============================================================

alter table public.remittances
  add column if not exists received_by_name text;
alter table public.remittances
  add column if not exists received_by_id text;
