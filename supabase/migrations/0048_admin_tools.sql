-- =============================================================
-- Giro — Super-Admin fase 2: anuncio global + detalle de usuario
-- Mismas salvaguardas: cada función comprueba is_superadmin() o lanza error.
-- Requiere 0047 (is_superadmin) y 0045 (announcements). Idempotente.
-- =============================================================

-- ---------- 1) Anuncio global: crea el aviso para TODOS los negocios ----------
-- Inserta una fila de announcement por cada operador, de modo que el aviso llega
-- a los clientes de todos los negocios con las políticas RLS ya existentes.
create or replace function public.admin_broadcast(
  p_title text,
  p_body text default null,
  p_emoji text default null
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'El título es obligatorio';
  end if;
  insert into public.announcements (operator_id, title, body, emoji, active)
  select p.id, trim(p_title), nullif(trim(p_body), ''), nullif(trim(p_emoji), ''), true
  from public.profiles p
  where p.role = 'operador';
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.admin_broadcast(text, text, text) to authenticated;

-- ---------- 2) Detalle de un usuario/cliente + sus remesas ----------
create or replace function public.admin_user_detail(p_user uuid)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare result json;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select json_build_object(
    'user', (
      select json_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'role', p.role,
        'member_status', p.member_status,
        'operator_id', p.operator_id,
        'created_at', p.created_at,
        'phone', p.phone,
        'business_name', bs.business_name
      )
      from public.profiles p
      left join public.business_settings bs on bs.operator_id = p.operator_id
      where p.id = p_user
    ),
    'remesas_count', (select count(*) from public.remittances where created_by = p_user),
    'remesas_volume', (select coalesce(sum(amount_usd), 0) from public.remittances where created_by = p_user),
    'remesas', (
      select coalesce(json_agg(r), '[]'::json)
      from (
        select rm.id, rm.date, rm.amount_usd, rm.status
        from public.remittances rm
        where rm.created_by = p_user
        order by rm.date desc, rm.created_at desc
        limit 100
      ) r
    )
  ) into result;
  return result;
end $$;
grant execute on function public.admin_user_detail(uuid) to authenticated;
