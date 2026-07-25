-- =============================================================
-- Giro — Meta personal del repartidor (mensual, en su propio perfil)
-- La meta del negocio (business_settings.monthly_goal) es del operador; el
-- repartidor tiene la suya, guardada en su perfil. Tolerante si no existe.
-- Ejecuta después de 0031. Idempotente.
-- =============================================================

alter table public.profiles
  add column if not exists monthly_goal numeric;
