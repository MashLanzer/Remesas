-- =============================================================
-- Giro — Anuncios del operador para sus clientes
-- El operador publica avisos (promo, horario, etc.) que sus clientes ven en su
-- inicio. Lectura: clientes/personal ven los activos; el operador ve todos los
-- suyos para gestionarlos. Escritura: solo el operador.
-- Ejecuta después de 0044. Idempotente.
-- =============================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  title text not null,
  body text,
  emoji text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists announcements_operator_idx
  on public.announcements (operator_id);

alter table public.announcements enable row level security;

drop policy if exists "announcements_select" on public.announcements;
drop policy if exists "announcements_write" on public.announcements;

-- El operador ve todos los suyos; clientes/personal solo los activos.
create policy "announcements_select" on public.announcements
  for select using (
    operator_id = public.current_operator_id()
    and (public.current_is_operador() or active)
  );

-- Crear/editar/borrar: solo el operador de ese negocio.
create policy "announcements_write" on public.announcements
  for all using (
    operator_id = public.current_operator_id()
    and public.current_is_operador()
  )
  with check (
    operator_id = public.current_operator_id()
    and public.current_is_operador()
  );
