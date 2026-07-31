-- =============================================================
-- Giro — Centro de notificaciones in-app (cliente)
-- Los avisos se derivan de los propios pedidos del cliente (entregado/aceptado/
-- rechazado), así que NO hace falta una tabla de notificaciones. Solo guardamos
-- cuándo el cliente vio por última vez la campana, para marcar los "nuevos".
-- Ejecuta en el SQL Editor de Supabase. Idempotente.
-- =============================================================

alter table public.profiles
  add column if not exists notifications_seen_at timestamptz;
