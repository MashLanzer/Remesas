-- Alertas de tasa del cliente: "avísame cuando 1 USD llegue a X CUP".
-- Cuando la tasa del negocio para esa moneda alcanza (o supera) el objetivo,
-- la app le muestra un aviso al cliente para que aproveche y envíe.

create table if not exists public.client_rate_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  currency text not null,
  target_rate numeric(14, 4) not null,
  created_at timestamptz not null default now(),
  unique (user_id, currency)
);

create index if not exists cra_user_idx
  on public.client_rate_alerts (user_id);

alter table public.client_rate_alerts enable row level security;

drop policy if exists cra_all on public.client_rate_alerts;
create policy cra_all on public.client_rate_alerts
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
