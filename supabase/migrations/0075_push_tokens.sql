-- =============================================================
-- Giro — Tokens de notificaciones push (FCM)
-- Cada dispositivo guarda su token para recibir avisos al teléfono. El usuario
-- gestiona los suyos; el envío se hace desde el servidor con la clave de
-- servicio (fuera de RLS). Ejecuta después de 0074. Idempotente.
-- =============================================================

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Cada quien gestiona sus propios tokens.
drop policy if exists "push_tokens_all" on public.push_tokens;
create policy "push_tokens_all" on public.push_tokens
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
