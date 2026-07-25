-- =============================================================
-- Giro — Reseñas del servicio (⭐) con acceso público, privado y verificado
-- - Califican SOLO clientes con un envío entregado/recibido (verificado, por RPC).
-- - Lectura privada (app): operador ve todas; repartidor las suyas; cliente la suya.
-- - Lectura pública (anónima): resumen + lista para una página de reputación.
-- Ejecuta después de 0043. Idempotente.
-- =============================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  client_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid not null,
  deliverer_id uuid,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id)
);
create index if not exists reviews_operator_idx on public.reviews (operator_id);
create index if not exists reviews_deliverer_idx on public.reviews (deliverer_id);

alter table public.reviews enable row level security;
drop policy if exists "reviews_select" on public.reviews;
-- Lectura en la app: personal del negocio + el autor.
create policy "reviews_select" on public.reviews
  for select using (
    operator_id = public.current_operator_id()
    and (
      public.current_is_operador()
      or deliverer_id = auth.uid()
      or client_id = auth.uid()
    )
  );
-- Sin políticas de escritura: solo se inserta por submit_review (SECURITY DEFINER).

-- El cliente califica un envío suyo YA entregado/recibido. Verificado y único
-- por pedido (se puede actualizar la propia reseña).
create or replace function public.submit_review(
  p_order uuid, p_rating int, p_comment text
) returns boolean language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; dlv uuid;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then return false; end if;
  select * into o from public.orders where id = p_order;
  if o.id is null or o.client_id is distinct from auth.uid() then return false; end if;
  if o.delivered_at is null and o.received_at is null then return false; end if;
  select deliverer_id into dlv from public.remittances where id = o.remittance_id;
  insert into public.reviews (operator_id, client_id, order_id, deliverer_id, rating, comment)
    values (o.operator_id, auth.uid(), o.id, dlv, p_rating, nullif(trim(p_comment), ''))
  on conflict (order_id) do update
    set rating = excluded.rating, comment = excluded.comment, created_at = now();
  return true;
end $$;

-- Resolver el operador de una página pública por su código (o el del que llama).
create or replace function public._resolve_operator(p_code text)
returns uuid language sql stable security definer set search_path = public as $$
  select case
    when p_code is null or p_code = '' then
      (select operator_id from public.profiles where id = auth.uid())
    else
      (select id from public.profiles where operator_code = upper(p_code) and role = 'operador' limit 1)
  end
$$;

-- Resumen público: nombre del negocio, promedio y total de reseñas.
create or replace function public.business_review_summary(p_code text default null)
returns table (business_name text, avg_rating numeric, total bigint)
language sql stable security definer set search_path = public as $$
  select
    (select b.business_name from public.business_settings b
       where b.operator_id = public._resolve_operator(p_code) limit 1),
    coalesce(round(avg(r.rating)::numeric, 2), 0),
    count(r.id)::bigint
  from public.reviews r
  where r.operator_id = public._resolve_operator(p_code)
$$;

-- Lista pública: estrellas, comentario, nombre de pila y fecha.
create or replace function public.business_review_list(
  p_code text default null, p_limit int default 30
)
returns table (rating int, comment text, name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.rating, r.comment,
         split_part(coalesce(p.full_name, 'Cliente'), ' ', 1),
         r.created_at
  from public.reviews r
  left join public.profiles p on p.id = r.client_id
  where r.operator_id = public._resolve_operator(p_code)
  order by r.created_at desc
  limit greatest(1, least(p_limit, 100))
$$;

grant execute on function public.submit_review(uuid, int, text) to authenticated;
grant execute on function public.business_review_summary(text) to anon, authenticated;
grant execute on function public.business_review_list(text, int) to anon, authenticated;
revoke execute on function public._resolve_operator(text) from public;
