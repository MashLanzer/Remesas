-- =============================================================
-- Giro — Foto de perfil (avatar) del usuario
-- Ejecuta después de 0026. Idempotente.
-- =============================================================

alter table public.profiles add column if not exists avatar_url text;
