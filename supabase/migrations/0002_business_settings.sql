-- =============================================================
-- Remesas — configuración del negocio (una sola fila, compartida)
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- =============================================================

create table if not exists public.business_settings (
  id boolean primary key default true,
  commission_threshold numeric(12, 2) not null default 100,
  commission_percent numeric(6, 2) not null default 10,
  commission_flat numeric(12, 2) not null default 5,
  default_currency text not null default 'CUP'
    check (default_currency in ('CUP', 'USD', 'MLC', 'EUR')),
  default_payment_method text,
  business_name text,
  partner_name text,
  updated_at timestamptz not null default now(),
  constraint business_settings_single_row check (id)
);

alter table public.business_settings enable row level security;

drop policy if exists "business_settings_all" on public.business_settings;
create policy "business_settings_all" on public.business_settings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Fila única con los valores por defecto (las reglas actuales).
insert into public.business_settings (id)
values (true)
on conflict (id) do nothing;
