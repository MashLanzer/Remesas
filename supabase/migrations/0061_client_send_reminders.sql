-- Recordatorios de envío del cliente: "recuérdame enviar a Mamá cada mes".
-- Sin notificaciones push: cuando llega la fecha (next_at <= hoy), la app le
-- muestra un aviso al abrirla, con el envío ya prellenado. El cliente puede
-- posponerlo (suma el intervalo) o quitarlo.

create table if not exists public.client_send_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,               -- apodo/nombre a mostrar ("Mamá")
  name text,                         -- nombre real del beneficiario
  phone text,
  province text,
  amount_usd numeric(12, 2) not null default 0,
  currency text not null default 'CUP',
  interval_days integer not null default 30,   -- cada cuántos días recuerda
  next_at date not null,             -- próxima fecha del recordatorio
  created_at timestamptz not null default now()
);

create index if not exists csr_user_idx
  on public.client_send_reminders (user_id, next_at);

alter table public.client_send_reminders enable row level security;

drop policy if exists csr_all on public.client_send_reminders;
create policy csr_all on public.client_send_reminders
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
