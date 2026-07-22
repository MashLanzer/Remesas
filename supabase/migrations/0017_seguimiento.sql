-- =============================================================
-- Giro — Fase 3: seguimiento en vivo + enlace público del beneficiario
-- Ejecuta después de la 0016. Idempotente.
-- =============================================================

-- ---------- 1) Marcas de tiempo del pedido + token del enlace ----------
alter table public.orders add column if not exists accepted_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists received_at timestamptz;
alter table public.orders add column if not exists track_token text;

-- Token por defecto para nuevos pedidos + relleno de los existentes.
alter table public.orders
  alter column track_token set default replace(gen_random_uuid()::text, '-', '');
update public.orders set track_token = replace(gen_random_uuid()::text, '-', '')
  where track_token is null;
create unique index if not exists orders_track_token_idx
  on public.orders (track_token) where track_token is not null;

-- ---------- 2) Enlace público del beneficiario (sin login) ----------
-- Devuelve solo lo necesario para el seguimiento; nada sensible del negocio.
create or replace function public.track_get(p_token text)
returns table (
  beneficiary_name text,
  amount_usd numeric,
  local_amount numeric,
  delivery_currency text,
  status text,
  created_at timestamptz,
  accepted_at timestamptz,
  delivered_at timestamptz,
  received_at timestamptz,
  business_name text
)
language sql stable security definer set search_path = public as $$
  select o.beneficiary_name, o.amount_usd,
         (select r.local_amount from public.remittances r
           where r.id = o.remittance_id) as local_amount,
         o.delivery_currency, o.status,
         o.created_at, o.accepted_at, o.delivered_at, o.received_at,
         (select b.business_name from public.business_settings b
           where b.operator_id = o.operator_id limit 1)
  from public.orders o
  where o.track_token = p_token
  limit 1
$$;

-- El beneficiario confirma que ya recibió (solo si ya está entregado).
create or replace function public.track_confirm(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders
     set received_at = coalesce(received_at, now())
   where track_token = p_token and delivered_at is not null;
end $$;

grant execute on function public.track_get(text) to anon, authenticated;
grant execute on function public.track_confirm(text) to anon, authenticated;

-- ---------- 3) Endurecer el insert de pedidos: nace sin marcas de tiempo ----------
-- (Evita que un cliente fabrique por API un pedido ya "entregado/recibido".)
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders
  for insert with check (
    operator_id = public.current_operator_id()
    and client_id = auth.uid()
    and status = 'pendiente'
    and accepted_by is null
    and remittance_id is null
    and accepted_at is null
    and delivered_at is null
    and received_at is null
  );
