-- =============================================================
-- Remesas — historial de tasas de cambio (variación y mini-gráfico en Tasas)
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- =============================================================

create table if not exists public.rate_history (
  id uuid primary key default gen_random_uuid(),
  currency text not null check (currency in ('CUP', 'USD', 'MLC', 'EUR')),
  rate numeric(14, 4) not null,
  changed_at timestamptz not null default now()
);

create index if not exists rate_history_currency_idx
  on public.rate_history (currency, changed_at);

alter table public.rate_history enable row level security;

drop policy if exists "rate_history_all" on public.rate_history;
create policy "rate_history_all" on public.rate_history
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
