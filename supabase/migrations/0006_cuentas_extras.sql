-- =============================================================
-- Remesas — extras de Cuentas: foto del pago y umbral de recordatorio
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- (El bucket 'receipts' ya se creó en la migración 0004.)
-- =============================================================

alter table public.settlements
  add column if not exists receipt_url text;

alter table public.business_settings
  add column if not exists settle_threshold numeric(12, 2);
