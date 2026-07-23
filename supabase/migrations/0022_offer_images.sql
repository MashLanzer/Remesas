-- =============================================================
-- Giro — Imagen en anuncios / ofertas
-- La imagen se guarda en el bucket público existente "receipts" (ruta
-- offers/…). Solo hace falta la columna con la URL pública.
-- Ejecuta después de 0021. Idempotente.
-- =============================================================

alter table public.offers add column if not exists image_url text;
