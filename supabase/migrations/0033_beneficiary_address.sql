-- =============================================================
-- Giro — Dirección exacta del beneficiario (para mapa preciso)
-- Hasta ahora solo se guardaba la provincia; la dirección permite abrir la
-- ubicación exacta en el mapa y facilita el reparto. Tolerante si no existe.
-- Ejecuta después de 0032. Idempotente.
-- =============================================================

alter table public.beneficiaries
  add column if not exists address text;
