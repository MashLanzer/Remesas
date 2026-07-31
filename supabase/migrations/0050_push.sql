-- =============================================================
-- Giro — Notificaciones push: suscripciones de dispositivos
-- Guarda las suscripciones Web Push (endpoint + claves) y los tokens FCM
-- (Android nativo). Cada usuario administra las suyas. El envío (servidor) leerá
-- estas filas mediante una función SECURITY DEFINER que se añade en el paso de
-- envío. Ejecuta en el SQL Editor de Supabase. Idempotente.
-- =============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'web' check (kind in ('web', 'fcm')),
  endpoint text,           -- Web Push
  p256dh text,             -- Web Push (clave pública del navegador)
  auth text,               -- Web Push (secreto de autenticación)
  fcm_token text,          -- Android nativo (FCM)
  user_agent text,
  created_at timestamptz not null default now()
);

-- Evitar duplicados por dispositivo.
create unique index if not exists push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint) where endpoint is not null;
create unique index if not exists push_subscriptions_fcm_idx
  on public.push_subscriptions (fcm_token) where fcm_token is not null;
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Cada quien administra SUS propias suscripciones.
drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions
  for delete using (user_id = auth.uid());
