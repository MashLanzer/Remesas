-- =============================================================
-- Giro — Fase 6: RLS (blindaje en la base)
-- Nadie puede leer/escribir datos de otro negocio ni de otro repartidor,
-- ni siquiera llamando a la API directamente. Ejecuta en el SQL Editor.
-- Idempotente: se puede correr varias veces sin romper nada.
-- =============================================================

-- ---------- 1) Funciones auxiliares (SECURITY DEFINER) ----------
-- Van con SECURITY DEFINER para poder leer profiles sin que las propias
-- políticas de profiles entren en recursión.

-- Negocio (tenant) al que pertenece el usuario actual.
--  · operador            -> su propio id
--  · repartidor ACTIVO   -> el id de su operador
--  · pendiente/quitado/sin rol -> null (no ve datos de ningún negocio)
create or replace function public.current_operator_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.role = 'operador' then p.id
    when p.role = 'repartidor' and p.member_status = 'active' then p.operator_id
    else null
  end
  from public.profiles p
  where p.id = auth.uid()
$$;

-- ¿El usuario actual es operador (dueño del negocio)?
create or replace function public.current_is_operador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'operador' from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

-- Resuelve un código de equipo -> id del operador (para que un repartidor
-- pueda unirse sin poder leer el perfil ajeno).
create or replace function public.operator_by_code(p_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.operator_code = p_code and p.role = 'operador'
  limit 1
$$;

-- ¿Ese código ya está en uso? (para generar códigos únicos sin leer perfiles ajenos)
create or replace function public.operator_code_taken(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles p where p.operator_code = p_code
  )
$$;

grant execute on function public.current_operator_id() to authenticated;
grant execute on function public.current_is_operador() to authenticated;
grant execute on function public.operator_by_code(text) to authenticated;
grant execute on function public.operator_code_taken(text) to authenticated;

-- ---------- 2) profiles ----------
-- Cada quien ve/edita su perfil. El operador además ve/gestiona a su equipo.
alter table public.profiles enable row level security;

drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or (public.current_is_operador() and operator_id = public.current_operator_id())
  );

create policy "profiles_insert" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update" on public.profiles
  for update using (
    id = auth.uid()
    or (public.current_is_operador() and operator_id = public.current_operator_id())
  )
  with check (
    id = auth.uid()
    or (public.current_is_operador() and operator_id = public.current_operator_id())
  );

-- ---------- 3) Tablas simples: todo el negocio comparte (operador + repartidores) ----------
-- clients, beneficiaries, exchange_rates, rate_history, business_settings:
-- visibles/editables por cualquiera del mismo negocio.
do $$
declare t text;
begin
  foreach t in array array[
    'clients', 'beneficiaries', 'exchange_rates', 'rate_history', 'business_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%s_all" on public.%I;', t, t);
    execute format('drop policy if exists "%s_tenant" on public.%I;', t, t);
    execute format(
      'create policy "%s_tenant" on public.%I for all '
      'using (operator_id = public.current_operator_id()) '
      'with check (operator_id = public.current_operator_id());',
      t, t
    );
  end loop;
end $$;

-- ---------- 4) remittances: el repartidor solo ve/toca las suyas ----------
alter table public.remittances enable row level security;
drop policy if exists "remittances_all" on public.remittances;
drop policy if exists "remittances_select" on public.remittances;
drop policy if exists "remittances_insert" on public.remittances;
drop policy if exists "remittances_update" on public.remittances;
drop policy if exists "remittances_delete" on public.remittances;

create policy "remittances_select" on public.remittances
  for select using (
    operator_id = public.current_operator_id()
    and (public.current_is_operador() or deliverer_id = auth.uid())
  );

create policy "remittances_insert" on public.remittances
  for insert with check (operator_id = public.current_operator_id());

create policy "remittances_update" on public.remittances
  for update using (
    operator_id = public.current_operator_id()
    and (public.current_is_operador() or deliverer_id = auth.uid())
  )
  with check (operator_id = public.current_operator_id());

create policy "remittances_delete" on public.remittances
  for delete using (
    operator_id = public.current_operator_id()
    and (public.current_is_operador() or deliverer_id = auth.uid())
  );

-- ---------- 5) settlements: el repartidor solo ve las que le tocan ----------
alter table public.settlements enable row level security;
drop policy if exists "settlements_all" on public.settlements;
drop policy if exists "settlements_select" on public.settlements;
drop policy if exists "settlements_write" on public.settlements;

create policy "settlements_select" on public.settlements
  for select using (
    operator_id = public.current_operator_id()
    and (public.current_is_operador() or deliverer_id = auth.uid())
  );

-- Crear/editar/borrar liquidaciones: dentro del negocio.
create policy "settlements_write" on public.settlements
  for all using (operator_id = public.current_operator_id())
  with check (operator_id = public.current_operator_id());

-- ---------- 6) activity_log: solo lectura filtrada; nadie edita el historial ----------
alter table public.activity_log enable row level security;
drop policy if exists "activity_log_all" on public.activity_log;
drop policy if exists "activity_log_select" on public.activity_log;
drop policy if exists "activity_log_insert" on public.activity_log;

-- El operador ve todo lo de su negocio; el repartidor solo sus propias acciones.
create policy "activity_log_select" on public.activity_log
  for select using (
    operator_id = public.current_operator_id()
    and (public.current_is_operador() or actor_id = auth.uid())
  );

-- Cada quien solo puede registrar acciones a su propio nombre.
create policy "activity_log_insert" on public.activity_log
  for insert with check (actor_id = auth.uid());
