-- =============================================================
-- Remesas — extras de Tasas: tasa de mercado (referencia) y ocultar monedas
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- =============================================================

alter table public.exchange_rates
  add column if not exists market_rate numeric(14, 4);

alter table public.exchange_rates
  add column if not exists active boolean not null default true;
