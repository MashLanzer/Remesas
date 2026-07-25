-- =============================================================
-- Giro — Estado "En camino" del repartidor (marca de tiempo, sin tocar el enum)
-- Permite al repartidor marcar que salió a entregar una remesa pendiente. No
-- cambia el estado (pendiente/entregado/liquidado): solo añade una marca de
-- tiempo opcional. Tolerante: si la columna no existe, la app degrada.
-- Ejecuta después de 0030. Idempotente.
-- =============================================================

alter table public.remittances
  add column if not exists en_route_at timestamptz;
