-- =============================================================
-- Giro — Meta de número de entregas del repartidor (mensual)
-- Complementa la meta en dinero (monthly_goal): una meta de cuántas entregas
-- quiere hacer en el mes. Tolerante si no existe.
-- Ejecuta después de 0039. Idempotente.
-- =============================================================

alter table public.profiles
  add column if not exists monthly_goal_count integer;
