-- =============================================================
-- Giro — Parche de seguridad: blindar cambios de rol/negocio en profiles
-- Cierra una escalada de privilegios: con las políticas anteriores, un usuario
-- podía editar SU propio perfil por API y ponerse role='repartidor',
-- member_status='active', operator_id=<otro negocio> y así robar acceso.
-- Ahora esos campos solo cambian vía funciones SECURITY DEFINER controladas.
-- Ejecuta después de la 0015. Idempotente.
-- =============================================================

-- ---------- 1) Trigger que impide cambiar campos sensibles directamente ----------
-- Los cambios legítimos pasan por funciones SECURITY DEFINER (owner = postgres),
-- donde current_user deja de ser 'authenticated'. Un PATCH directo del usuario
-- (current_user = 'authenticated') no puede tocar rol/negocio/estado/código.
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'supabase_admin', 'service_role') then
    if new.role is distinct from old.role
       or new.operator_id is distinct from old.operator_id
       or new.member_status is distinct from old.member_status
       or new.operator_code is distinct from old.operator_code then
      raise exception 'No puedes cambiar rol/negocio/estado directamente';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- ---------- 2) Funciones de transición (las únicas que pueden tocar esos campos) ----------

-- El usuario entra como cliente y se asocia al negocio por defecto.
create or replace function public.become_cliente()
returns void language plpgsql security definer set search_path = public as $$
declare op uuid;
begin
  select public.default_operator() into op;
  if op is null then
    raise exception 'No hay negocio disponible';
  end if;
  update public.profiles
     set role = 'cliente', operator_id = op, member_status = 'active'
   where id = auth.uid();
end $$;

-- El usuario se une a un operador por código (queda pendiente). Devuelve el id
-- del operador, o null si el código no existe.
create or replace function public.join_operator(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare op uuid;
begin
  select id into op from public.profiles
   where operator_code = p_code and role = 'operador' limit 1;
  if op is null then return null; end if;
  update public.profiles
     set role = 'repartidor', operator_id = op, member_status = 'pending'
   where id = auth.uid();
  return op;
end $$;

-- El usuario crea su negocio (operador). Solo se usa si se reactiva el registro.
create or replace function public.become_operador(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set role = 'operador', operator_id = auth.uid(),
         member_status = 'active', operator_code = p_code
   where id = auth.uid();
end $$;

-- El operador acepta a un repartidor pendiente de su equipo.
create or replace function public.approve_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.current_is_operador() then return; end if;
  update public.profiles
     set member_status = 'active'
   where id = p_user
     and operator_id = public.current_operator_id()
     and role = 'repartidor';
end $$;

-- El operador quita/rechaza a un repartidor (mantiene operator_id, marca removed).
create or replace function public.remove_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.current_is_operador() then return; end if;
  update public.profiles
     set role = null, member_status = 'removed'
   where id = p_user and operator_id = public.current_operator_id();
end $$;

-- El operador regenera su código de equipo.
create or replace function public.regenerate_code(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.current_is_operador() then return; end if;
  update public.profiles set operator_code = p_code where id = auth.uid();
end $$;

grant execute on function public.become_cliente() to authenticated;
grant execute on function public.join_operator(text) to authenticated;
grant execute on function public.become_operador(text) to authenticated;
grant execute on function public.approve_member(uuid) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
grant execute on function public.regenerate_code(text) to authenticated;

-- ---------- 3) activity_log: cerrar inserción cruzada (solo personal, su negocio) ----------
drop policy if exists "activity_log_insert" on public.activity_log;
create policy "activity_log_insert" on public.activity_log
  for insert with check (
    actor_id = auth.uid()
    and operator_id = public.current_operator_id()
    and public.current_is_staff()
  );
