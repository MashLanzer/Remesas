-- Seguimiento de referidos: el cliente ve la LISTA de amigos que invitó y en
-- qué punto está cada uno, no solo el total. RLS-safe con SECURITY DEFINER:
-- solo devuelve a los referidos por el propio usuario (referred_by = auth.uid()).
-- Estado:
--   'premiado'   -> ya recibió su primer envío y ambos ganaron puntos
--   'activo'     -> ya hizo al menos un pedido, aún sin premio
--   'registrado' -> se unió con el enlace pero todavía no pide
-- Idempotente.

create or replace function public.my_referrals()
returns table (
  name text,
  status text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(btrim(p.full_name), ''), 'Invitado') as name,
    case
      when p.referral_rewarded then 'premiado'
      when exists (select 1 from public.orders o where o.client_id = p.id) then 'activo'
      else 'registrado'
    end as status,
    p.created_at as joined_at
  from public.profiles p
  where p.referred_by = auth.uid()
  order by p.created_at desc
$$;

grant execute on function public.my_referrals() to authenticated;
revoke execute on function public.my_referrals() from public, anon;
