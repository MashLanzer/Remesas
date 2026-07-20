-- =============================================================
-- Remesas — meta de ganancia mensual (para la barra de progreso en Reportes)
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- =============================================================

alter table public.business_settings
  add column if not exists monthly_goal numeric(12, 2);
