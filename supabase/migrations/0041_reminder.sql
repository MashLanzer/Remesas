-- =============================================================
-- Giro — Recordatorio de entrega del repartidor
-- El repartidor programa un recordatorio (fecha/hora) para una remesa pendiente.
-- Se muestra en la app; no envía push. Tolerante si la columna no existe.
-- Ejecuta después de 0040. Idempotente.
-- =============================================================

alter table public.remittances
  add column if not exists reminder_at timestamptz;
