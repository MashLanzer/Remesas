-- =============================================================
-- Giro — Vaquita familiar
-- Varias personas aportan a UNA misma entrega a un beneficiario. El dinero se
-- paga por fuera (Zelle/CashApp del negocio) como el resto; la vaquita organiza
-- el bote. Aportes por enlace público (sin cuenta). Al final el organizador la
-- convierte en un pedido. Ejecuta después de 0073. Idempotente.
-- =============================================================

create table if not exists public.vaquitas (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  organizer_client_id uuid not null,
  title text,
  beneficiary_name text not null,
  beneficiary_phone text,
  province text,
  beneficiary_address text,
  delivery_currency text not null default 'CUP',
  goal_usd numeric not null default 0,
  deadline date,
  status text not null default 'abierta'
    check (status in ('abierta', 'enviada', 'cerrada')),
  share_token text not null unique,
  order_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists vaquitas_operator_idx on public.vaquitas (operator_id);
create index if not exists vaquitas_organizer_idx on public.vaquitas (organizer_client_id);

create table if not exists public.vaquita_contributions (
  id uuid primary key default gen_random_uuid(),
  vaquita_id uuid not null references public.vaquitas(id) on delete cascade,
  contributor_name text not null,
  amount_usd numeric not null check (amount_usd > 0),
  proof_url text,
  status text not null default 'informado'
    check (status in ('informado', 'confirmado')),
  created_at timestamptz not null default now()
);
create index if not exists vaquita_contrib_vaquita_idx
  on public.vaquita_contributions (vaquita_id);

alter table public.vaquitas enable row level security;
alter table public.vaquita_contributions enable row level security;

-- ---- Vaquitas: el organizador y el personal del negocio ----
drop policy if exists "vaquitas_select" on public.vaquitas;
create policy "vaquitas_select" on public.vaquitas
  for select using (
    organizer_client_id = auth.uid()
    or (operator_id = public.current_operator_id() and public.current_is_staff())
  );

drop policy if exists "vaquitas_insert" on public.vaquitas;
create policy "vaquitas_insert" on public.vaquitas
  for insert with check (
    organizer_client_id = auth.uid()
    and operator_id = public.current_operator_id()
  );

drop policy if exists "vaquitas_update" on public.vaquitas;
create policy "vaquitas_update" on public.vaquitas
  for update using (
    organizer_client_id = auth.uid()
    or (operator_id = public.current_operator_id() and public.current_is_staff())
  );

-- ---- Aportes: los ve el organizador y el personal; se crean por RPC ----
drop policy if exists "vaquita_contrib_select" on public.vaquita_contributions;
create policy "vaquita_contrib_select" on public.vaquita_contributions
  for select using (
    exists (
      select 1 from public.vaquitas v
      where v.id = vaquita_id
        and (
          v.organizer_client_id = auth.uid()
          or (v.operator_id = public.current_operator_id() and public.current_is_staff())
        )
    )
  );

drop policy if exists "vaquita_contrib_update" on public.vaquita_contributions;
create policy "vaquita_contrib_update" on public.vaquita_contributions
  for update using (
    exists (
      select 1 from public.vaquitas v
      where v.id = vaquita_id
        and v.operator_id = public.current_operator_id()
        and public.current_is_staff()
    )
  );

-- ---- RPC público: ver una vaquita por su token (con progreso y aportes) ----
create or replace function public.vaquita_by_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when v.id is null then null else jsonb_build_object(
    'id', v.id,
    'title', v.title,
    'beneficiary_name', v.beneficiary_name,
    'province', v.province,
    'delivery_currency', v.delivery_currency,
    'goal_usd', v.goal_usd,
    'deadline', v.deadline,
    'status', v.status,
    'business_name', (select b.business_name from public.business_settings b where b.operator_id = v.operator_id limit 1),
    'brand_hue', (select b.brand_hue from public.business_settings b where b.operator_id = v.operator_id limit 1),
    'phone', (select pr.phone from public.profiles pr where pr.id = v.operator_id limit 1),
    'zelle', (select pr.zelle from public.profiles pr where pr.id = v.operator_id limit 1),
    'cashapp', (select pr.cashapp from public.profiles pr where pr.id = v.operator_id limit 1),
    'paypal', (select pr.paypal from public.profiles pr where pr.id = v.operator_id limit 1),
    'raised', coalesce((select sum(c.amount_usd) from public.vaquita_contributions c where c.vaquita_id = v.id), 0),
    'contributions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', c.contributor_name,
        'amount', c.amount_usd,
        'status', c.status,
        'created_at', c.created_at
      ) order by c.created_at)
      from public.vaquita_contributions c where c.vaquita_id = v.id
    ), '[]'::jsonb)
  ) end
  from public.vaquitas v
  where v.share_token = p_token
  limit 1
$$;

-- ---- RPC público: aportar a la vaquita (queda "informado") ----
create or replace function public.vaquita_contribute(
  p_token text, p_name text, p_amount numeric, p_proof text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare vid uuid; cid uuid;
begin
  select id into vid from public.vaquitas
    where share_token = p_token and status = 'abierta' limit 1;
  if vid is null then return null; end if;
  if p_amount is null or p_amount <= 0
     or coalesce(btrim(p_name), '') = '' then
    return null;
  end if;
  insert into public.vaquita_contributions
    (vaquita_id, contributor_name, amount_usd, proof_url)
  values (vid, left(btrim(p_name), 80), p_amount, p_proof)
  returning id into cid;
  return cid;
end
$$;

grant execute on function public.vaquita_by_token(text) to anon, authenticated;
grant execute on function public.vaquita_contribute(text, text, numeric, text) to anon, authenticated;

-- ---- Storage: permitir subir el comprobante del aporte (bajo vaquitas/) ----
drop policy if exists "vaquita_proof_insert" on storage.objects;
create policy "vaquita_proof_insert" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = 'vaquitas'
  );
