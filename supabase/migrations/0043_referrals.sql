-- =============================================================
-- Giro — Programa de referidos (cliente invita a un amigo; ambos ganan puntos)
-- Modelo seguro: los vínculos y recompensas se tocan solo por funciones
-- SECURITY DEFINER; el guard de perfil bloquea el cambio directo.
-- Ejecuta después de 0042. Idempotente.
-- =============================================================

-- 1) Columnas
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid;
alter table public.profiles add column if not exists referral_rewarded boolean not null default false;
create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code) where referral_code is not null;

alter table public.business_settings
  add column if not exists referral_points integer not null default 50;

-- 2) Blindar referred_by y referral_rewarded en el guard (no se cambian directo).
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.bypass_profile_guard', true) is distinct from 'on'
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    if new.role is distinct from old.role
       or new.operator_id is distinct from old.operator_id
       or new.member_status is distinct from old.member_status
       or new.operator_code is distinct from old.operator_code
       or new.referred_by is distinct from old.referred_by
       or new.referral_rewarded is distinct from old.referral_rewarded then
      raise exception 'No puedes cambiar rol/negocio/estado/referido directamente';
    end if;
  end if;
  return new;
end
$$;

-- 3) Genera (si falta) y devuelve el código de referido del usuario actual.
create or replace function public.ensure_referral_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  cur text;
  candidate text;
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i int;
begin
  select referral_code into cur from public.profiles where id = auth.uid();
  if cur is not null then return cur; end if;
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = candidate);
  end loop;
  update public.profiles set referral_code = candidate where id = auth.uid();
  return candidate;
end $$;

-- 4) El usuario (referido) adjunta a quien lo invitó, por código. Solo si aún
-- no tiene referido, no es él mismo y ambos son del mismo negocio.
create or replace function public.apply_referral(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me public.profiles%rowtype;
  ref public.profiles%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.referred_by is not null then return false; end if;
  select * into ref from public.profiles
    where referral_code = upper(p_code) and role = 'cliente'
      and operator_id = me.operator_id
    limit 1;
  if ref.id is null or ref.id = me.id then return false; end if;
  perform set_config('app.bypass_profile_guard', 'on', true);
  update public.profiles set referred_by = ref.id where id = me.id;
  return true;
end $$;

-- 5) Recompensa el referido cuando el referido completa su primera entrega.
-- Solo lo dispara el personal del negocio (al marcar entregado). Idempotente
-- por referral_rewarded.
create or replace function public.reward_referral(p_referred uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  rp public.profiles%rowtype;
  op uuid;
  bonus int;
begin
  if not public.current_is_staff() then return; end if;
  op := public.current_operator_id();
  select * into rp from public.profiles where id = p_referred;
  if rp.id is null or rp.referred_by is null or rp.referral_rewarded
     or rp.operator_id is distinct from op then
    return;
  end if;
  select coalesce(referral_points, 50) into bonus
    from public.business_settings where operator_id = op limit 1;
  bonus := coalesce(bonus, 50);
  if bonus > 0 then
    insert into public.points_ledger (operator_id, client_id, delta, reason)
      values (op, rp.id, bonus, 'referido'),
             (op, rp.referred_by, bonus, 'referido');
  end if;
  perform set_config('app.bypass_profile_guard', 'on', true);
  update public.profiles set referral_rewarded = true where id = rp.id;
end $$;

-- 6) Estadísticas de referidos del usuario actual (para su tarjeta).
create or replace function public.my_referral_stats()
returns table (invited bigint, rewarded bigint, bonus integer)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) filter (where p.referred_by = auth.uid()) from public.profiles p)::bigint,
    (select count(*) filter (where p.referred_by = auth.uid() and p.referral_rewarded) from public.profiles p)::bigint,
    coalesce(
      (select b.referral_points from public.business_settings b
        where b.operator_id = (select operator_id from public.profiles where id = auth.uid())
        limit 1),
      50
    )
$$;

grant execute on function public.ensure_referral_code() to authenticated;
grant execute on function public.apply_referral(text) to authenticated;
grant execute on function public.reward_referral(uuid) to authenticated;
grant execute on function public.my_referral_stats() to authenticated;
