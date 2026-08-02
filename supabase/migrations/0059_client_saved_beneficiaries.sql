-- Libreta de beneficiarios del CLIENTE, guardada en su cuenta (antes vivía solo
-- en el localStorage del teléfono y se perdía al reinstalar / cambiar de móvil).
-- Cada fila es de un usuario cliente (auth.uid). Guarda un apodo ("Mamá"), el
-- nombre real, teléfono, provincia y si es favorito.

create table if not exists public.client_saved_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  apodo text not null,
  name text not null,
  phone text,
  province text,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists csb_user_idx
  on public.client_saved_beneficiaries (user_id, favorite desc, created_at desc);

alter table public.client_saved_beneficiaries enable row level security;

-- Cada quien ve y gestiona SOLO su propia libreta.
drop policy if exists csb_all on public.client_saved_beneficiaries;
create policy csb_all on public.client_saved_beneficiaries
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
