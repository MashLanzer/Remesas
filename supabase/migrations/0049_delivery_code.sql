-- =============================================================
-- Giro — Código de entrega de un solo uso (OTP)
-- El remitente recibe un código de 4 dígitos que le pasa a su familiar; el
-- repartidor debe teclearlo al entregar. Clave de seguridad: el código vive en
-- una tabla aparte cuya RLS NO deja leerlo al repartidor — solo lo VALIDA por
-- una función SECURITY DEFINER. El operador y el remitente sí pueden verlo.
-- Ejecuta en el SQL Editor de Supabase. Idempotente.
-- =============================================================

create table if not exists public.delivery_codes (
  remittance_id uuid primary key references public.remittances (id) on delete cascade,
  operator_id uuid,
  code text not null,
  attempts int not null default 0,
  verified_at timestamptz,
  no_code_reason text,               -- si se entregó sin código, el motivo
  created_at timestamptz not null default now()
);

alter table public.delivery_codes enable row level security;

-- Lectura: el operador del negocio, o el remitente (quien creó la remesa).
-- El repartidor NO entra por ninguna de las dos vías → no puede ver el código.
drop policy if exists "delivery_codes_select" on public.delivery_codes;
create policy "delivery_codes_select" on public.delivery_codes
  for select using (
    (operator_id = public.current_operator_id() and public.current_is_operador())
    or exists (
      select 1 from public.remittances r
      where r.id = delivery_codes.remittance_id
        and r.created_by = auth.uid()
    )
  );
-- No hay políticas de insert/update/delete: solo el trigger y las funciones
-- SECURITY DEFINER de abajo tocan esta tabla.

-- ---------- Generar el código automáticamente al crear una remesa ----------
create or replace function public.gen_delivery_code()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.delivery_codes (remittance_id, operator_id, code)
  values (
    new.id,
    new.operator_id,
    lpad((floor(random() * 10000))::int::text, 4, '0')
  )
  on conflict (remittance_id) do nothing;
  return new;
end $$;

drop trigger if exists remittances_delivery_code on public.remittances;
create trigger remittances_delivery_code
  after insert on public.remittances
  for each row execute function public.gen_delivery_code();

-- ---------- Backfill: código para las remesas que ya existen ----------
insert into public.delivery_codes (remittance_id, operator_id, code)
select r.id, r.operator_id, lpad((floor(random() * 10000))::int::text, 4, '0')
from public.remittances r
where not exists (
  select 1 from public.delivery_codes d where d.remittance_id = r.id
);

-- ---------- Validar el código (lo llama el repartidor al entregar) ----------
-- Devuelve true si coincide (y lo marca verificado) o si la remesa no tiene
-- código (legacy). Cuenta intentos y bloquea tras 5 fallos.
create or replace function public.verify_delivery_code(p_remittance uuid, p_code text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare rec public.delivery_codes;
begin
  -- Solo personal del negocio dueño de la remesa puede validar.
  if not exists (
    select 1 from public.remittances r
    where r.id = p_remittance
      and r.operator_id = public.current_operator_id()
      and public.current_is_staff()
  ) then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  select * into rec from public.delivery_codes
    where remittance_id = p_remittance for update;

  if rec.remittance_id is null then
    return true; -- remesa sin código (no bloquea)
  end if;
  if rec.verified_at is not null then
    return true; -- ya verificado antes
  end if;
  if rec.attempts >= 5 then
    raise exception 'demasiados intentos' using errcode = 'P0001';
  end if;

  if rec.code = regexp_replace(coalesce(p_code, ''), '\D', '', 'g') then
    update public.delivery_codes
      set verified_at = now(), attempts = attempts + 1
      where remittance_id = p_remittance;
    return true;
  else
    update public.delivery_codes
      set attempts = attempts + 1
      where remittance_id = p_remittance;
    return false;
  end if;
end $$;
grant execute on function public.verify_delivery_code(uuid, text) to authenticated;

-- ---------- Entregar sin código (deja el motivo registrado) ----------
create or replace function public.deliver_without_code(p_remittance uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.remittances r
    where r.id = p_remittance
      and r.operator_id = public.current_operator_id()
      and public.current_is_staff()
  ) then
    raise exception 'no autorizado' using errcode = '42501';
  end if;
  update public.delivery_codes
    set no_code_reason = coalesce(nullif(trim(p_reason), ''), '(sin motivo)')
    where remittance_id = p_remittance;
end $$;
grant execute on function public.deliver_without_code(uuid, text) to authenticated;
