-- =============================================================
-- Remesas (Giro) — extras del Perfil: teléfono y métodos de cobro
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- =============================================================

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists zelle text;
alter table public.profiles add column if not exists cashapp text;
alter table public.profiles add column if not exists paypal text;
