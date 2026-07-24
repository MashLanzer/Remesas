-- =============================================================
-- Giro — Comprobante de entrega, separado del pago del cliente
-- receipt_url = pago del cliente (Zelle/CashApp). delivery_proof_url = entrega.
-- Ejecuta después de 0025. Idempotente.
-- =============================================================

alter table public.remittances
  add column if not exists delivery_proof_url text;
