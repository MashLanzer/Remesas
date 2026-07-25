-- =============================================================
-- Giro — Foto del carné (CI) de quien recibe, en la entrega
-- Prueba adicional: además del número de carné, la foto del documento.
-- Ejecuta después de 0038. Idempotente.
-- =============================================================

alter table public.remittances
  add column if not exists id_photo_url text;
