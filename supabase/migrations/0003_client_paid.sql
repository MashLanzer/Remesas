-- =============================================================
-- Remesas — control de cobro al cliente
-- Añade si el cliente ya te pagó (por defecto: sí).
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- =============================================================

alter table public.remittances
  add column if not exists client_paid boolean not null default true;
