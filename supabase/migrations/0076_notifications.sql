-- =============================================================
-- Giro — Centro de notificaciones (in-app) por usuario
-- Cada evento del sistema crea una fila para su destinatario. El push se manda
-- aparte con el mismo contenido. La creación se hace desde el servidor con
-- service_role (fuera de RLS). Ejecuta después de 0075. Idempotente.
-- =============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  operator_id uuid,
  type text not null,
  title text not null,
  body text,
  url text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

-- El destinatario ve y marca sus notificaciones. La creación es del servidor.
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (recipient_id = auth.uid());

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete using (recipient_id = auth.uid());
