-- Aviso de mensajes nuevos en el chat de un pedido. Se guarda, por usuario y
-- pedido, la última vez que abrió el chat; los "no leídos" son los mensajes del
-- OTRO lado posteriores a esa marca. Acceso solo por funciones SECURITY DEFINER.
-- Idempotente.

create table if not exists public.order_message_reads (
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (order_id, user_id)
);

alter table public.order_message_reads enable row level security;
-- Sin políticas: solo por funciones.

-- Marca el chat de un pedido como leído por el usuario actual (si tiene acceso).
create or replace function public.mark_order_messages_read(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  op uuid;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null then return; end if;
  op := public.current_operator_id();
  if not (
    o.client_id = auth.uid()
    or (public.current_is_staff() and o.operator_id = op)
  ) then
    return;
  end if;
  insert into public.order_message_reads (order_id, user_id, last_read_at)
  values (p_order, auth.uid(), now())
  on conflict (order_id, user_id) do update set last_read_at = now();
end
$$;

-- Cuenta de mensajes no leídos por pedido para el usuario actual. Cuenta los
-- mensajes del OTRO lado (si es cliente -> del negocio; si es staff -> del
-- cliente) posteriores a su última lectura.
create or replace function public.order_unread_counts()
returns table (order_id uuid, unread bigint)
language sql
stable
security definer
set search_path = public
as $$
  select m.order_id, count(*)::bigint as unread
  from public.order_messages m
  join public.orders o on o.id = m.order_id
  left join public.order_message_reads r
    on r.order_id = m.order_id and r.user_id = auth.uid()
  where (
    (o.client_id = auth.uid() and m.sender = 'negocio')
    or (public.current_is_staff()
        and o.operator_id = public.current_operator_id()
        and m.sender = 'cliente')
  )
  and (r.last_read_at is null or m.created_at > r.last_read_at)
  group by m.order_id
$$;

grant execute on function public.mark_order_messages_read(uuid) to authenticated;
grant execute on function public.order_unread_counts() to authenticated;
revoke execute on function public.mark_order_messages_read(uuid) from public, anon;
revoke execute on function public.order_unread_counts() from public, anon;
