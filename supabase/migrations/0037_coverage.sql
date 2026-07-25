-- =============================================================
-- Giro — Zona de cobertura del repartidor
-- El repartidor marca qué provincias cubre (lista separada por comas). El
-- operador la usa para asignar pedidos a quien cubre esa zona. Tolerante.
-- Ejecuta después de 0036. Idempotente.
-- =============================================================

alter table public.profiles
  add column if not exists coverage_provinces text;
