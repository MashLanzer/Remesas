-- Chat dentro de la app, por pedido, entre el cliente y el negocio. El acceso
-- y las inserciones pasan SOLO por funciones SECURITY DEFINER que verifican que
-- el que llama es el dueño del pedido (cliente) o personal del negocio dueño.
-- La tabla tiene RLS activa SIN políticas: nadie la toca directo, solo por las
-- funciones. Idempotente.

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  operator_id uuid not null,
  sender text not null check (sender in ('cliente', 'negocio')),
  sender_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists order_messages_order_idx
  on public.order_messages (order_id, created_at);

alter table public.order_messages enable row level security;
-- Sin políticas: el acceso directo queda denegado; todo va por las funciones.

-- Enviar un mensaje. El remitente (cliente/negocio) se deduce de la sesión.
create or replace function public.send_order_message(p_order uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  is_client boolean;
  is_staff boolean;
  op uuid;
  clean text;
begin
  clean := btrim(coalesce(p_body, ''));
  if clean = '' then return; end if;
  select * into o from public.orders where id = p_order;
  if o.id is null then return; end if;
  op := public.current_operator_id();
  is_client := (o.client_id = auth.uid());
  is_staff := (public.current_is_staff() and o.operator_id = op);
  if not (is_client or is_staff) then return; end if;
  insert into public.order_messages (order_id, operator_id, sender, sender_id, body)
  values (
    p_order,
    o.operator_id,
    case when is_client then 'cliente' else 'negocio' end,
    auth.uid(),
    left(clean, 2000)
  );
end
$$;

-- Listar los mensajes de un pedido (si el que llama tiene acceso).
create or replace function public.list_order_messages(p_order uuid)
returns table (id uuid, sender text, body text, created_at timestamptz)
language plpgsql
stable
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
  return query
    select m.id, m.sender, m.body, m.created_at
    from public.order_messages m
    where m.order_id = p_order
    order by m.created_at asc;
end
$$;

grant execute on function public.send_order_message(uuid, text) to authenticated;
grant execute on function public.list_order_messages(uuid) to authenticated;
revoke execute on function public.send_order_message(uuid, text) from public, anon;
revoke execute on function public.list_order_messages(uuid) from public, anon;
