-- =============================================================
-- Giro — Incidencia / intento fallido de entrega
-- El repartidor registra que no pudo entregar (motivo) sin rechazar la remesa:
-- queda pendiente para reintentar, con el último motivo, la hora y un conteo.
-- Ejecuta después de 0035. Idempotente.
-- =============================================================

alter table public.remittances
  add column if not exists last_incident text;
alter table public.remittances
  add column if not exists incident_at timestamptz;
alter table public.remittances
  add column if not exists incident_count integer not null default 0;
