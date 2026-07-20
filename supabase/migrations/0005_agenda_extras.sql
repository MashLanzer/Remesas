-- =============================================================
-- Remesas — extras de Agenda: favoritos y método de entrega
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- =============================================================

alter table public.clients
  add column if not exists pinned boolean not null default false;

alter table public.beneficiaries
  add column if not exists pinned boolean not null default false;

alter table public.beneficiaries
  add column if not exists preferred_delivery text;
