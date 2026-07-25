-- =============================================================
-- Giro — Firma de recepción en la entrega
-- El que recibe firma en pantalla; se guarda como imagen (data URL subida al
-- bucket) junto a la remesa. Tolerante si la columna no existe.
-- Ejecuta después de 0037. Idempotente.
-- =============================================================

alter table public.remittances
  add column if not exists signature_url text;
