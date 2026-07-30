-- =============================================================
-- Giro — Panel de Super-Admin (solo el dueño)
-- Da vista GLOBAL de todos los negocios/usuarios y unas pocas acciones.
-- Doble candado: además de proteger la página en el servidor, TODAS las
-- funciones de aquí empiezan comprobando is_superadmin() y, si no, lanzan error.
-- Así, aunque alguien adivine la URL /admin, la base le niega los datos.
-- Ejecuta en el SQL Editor de Supabase. Idempotente.
-- =============================================================

-- ---------- 0) ¿Es el super-admin? (correo del token verificado) ----------
-- El correo se lee del JWT firmado por Supabase (infalsificable). Si por algún
-- motivo no viene en el token, cae al email guardado en profiles.
-- SECURITY DEFINER para poder leer profiles.email saltándose RLS.
create or replace function public.is_superadmin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    lower(coalesce(
      auth.jwt() ->> 'email',
      (select email from public.profiles where id = auth.uid())
    )) = lower('brayanibarra0105@gmail.com'),
    false)
$$;
grant execute on function public.is_superadmin() to authenticated;

-- ---------- 1) Métricas globales de toda la plataforma ----------
create or replace function public.admin_metrics()
returns json
language plpgsql stable security definer set search_path = public
as $$
declare result json;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select json_build_object(
    'businesses',      (select count(*) from public.profiles where role = 'operador'),
    'operators',       (select count(*) from public.profiles where role = 'operador'),
    'repartidores',    (select count(*) from public.profiles where role = 'repartidor'),
    'clientes',        (select count(*) from public.profiles where role = 'cliente'),
    'users_total',     (select count(*) from public.profiles),
    'remesas_total',   (select count(*) from public.remittances),
    'volume_usd',      (select coalesce(sum(amount_usd), 0) from public.remittances),
    'remesas_month',   (select count(*) from public.remittances
                          where date_trunc('month', date) = date_trunc('month', current_date)),
    'volume_month',    (select coalesce(sum(amount_usd), 0) from public.remittances
                          where date_trunc('month', date) = date_trunc('month', current_date)),
    'remesas_pending', (select count(*) from public.remittances where status = 'pendiente'),
    'new_users_30d',   (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'clientes_30d',    (select count(*) from public.profiles
                          where role = 'cliente' and created_at > now() - interval '30 days')
  ) into result;
  return result;
end $$;
grant execute on function public.admin_metrics() to authenticated;

-- ---------- 2) Lista de negocios (operadores) con sus métricas ----------
create or replace function public.admin_businesses()
returns json
language plpgsql stable security definer set search_path = public
as $$
declare result json;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(json_agg(b order by b.remesas desc, b.created_at asc), '[]'::json)
  into result
  from (
    select
      op.id,
      op.email,
      op.full_name,
      op.created_at,
      bs.business_name,
      (select count(*) from public.profiles r
         where r.operator_id = op.id and r.role = 'repartidor')          as repartidores,
      (select count(*) from public.profiles c
         where c.operator_id = op.id and c.role = 'cliente')             as clientes,
      (select count(*) from public.remittances rm
         where rm.operator_id = op.id)                                    as remesas,
      (select coalesce(sum(amount_usd), 0) from public.remittances rm
         where rm.operator_id = op.id)                                    as volume_usd
    from public.profiles op
    left join public.business_settings bs on bs.operator_id = op.id
    where op.role = 'operador'
  ) b;
  return result;
end $$;
grant execute on function public.admin_businesses() to authenticated;

-- ---------- 3) Todos los usuarios (con búsqueda por nombre/correo) ----------
create or replace function public.admin_users(p_search text default null)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare result json;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(json_agg(u order by u.created_at desc), '[]'::json)
  into result
  from (
    select
      p.id, p.email, p.full_name, p.role, p.member_status,
      p.operator_id, p.created_at, bs.business_name
    from public.profiles p
    left join public.business_settings bs on bs.operator_id = p.operator_id
    where p_search is null or p_search = ''
       or p.email ilike '%' || p_search || '%'
       or coalesce(p.full_name, '') ilike '%' || p_search || '%'
    limit 500
  ) u;
  return result;
end $$;
grant execute on function public.admin_users(text) to authenticated;

-- ---------- 4) Clientes que usan la app-cliente (rol 'cliente') ----------
create or replace function public.admin_clients()
returns json
language plpgsql stable security definer set search_path = public
as $$
declare result json;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(json_agg(c order by c.created_at desc), '[]'::json)
  into result
  from (
    select
      p.id, p.email, p.full_name, p.created_at, p.operator_id,
      bs.business_name,
      (select count(*) from public.remittances rm where rm.created_by = p.id) as remesas
    from public.profiles p
    left join public.business_settings bs on bs.operator_id = p.operator_id
    where p.role = 'cliente'
    limit 1000
  ) c;
  return result;
end $$;
grant execute on function public.admin_clients() to authenticated;

-- ---------- 5) Acciones (modifican datos — mismas salvaguardas) ----------
-- Cambiar el rol de un usuario. Usa el bypass del guard (0016) igual que las
-- funciones de transición legítimas.
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role is not null and p_role not in ('operador', 'repartidor', 'cliente') then
    raise exception 'rol inválido';
  end if;
  perform set_config('app.bypass_profile_guard', 'on', true);
  update public.profiles set role = p_role where id = p_user;
end $$;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- Cambiar el estado de membresía (aprobar/suspender repartidor).
create or replace function public.admin_set_member_status(p_user uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('active', 'pending', 'removed') then
    raise exception 'estado inválido';
  end if;
  perform set_config('app.bypass_profile_guard', 'on', true);
  update public.profiles set member_status = p_status where id = p_user;
end $$;
grant execute on function public.admin_set_member_status(uuid, text) to authenticated;
