-- =============================================================
-- Giro — Imagen en los anuncios
-- Permite adjuntar una foto al anuncio (se muestra en el banner del cliente/
-- repartidor). Compatibilidad: columna opcional. Ejecuta después de 0071.
-- Idempotente.
-- =============================================================

alter table public.announcements
  add column if not exists image_url text;
