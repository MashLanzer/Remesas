-- =============================================================
-- Giro — Audiencia de los anuncios
-- Permite dirigir cada anuncio a los clientes, a los repartidores o a ambos.
-- Compatibilidad: por defecto 'clientes' (comportamiento anterior).
-- Ejecuta después de 0070. Idempotente.
-- =============================================================

alter table public.announcements
  add column if not exists audience text not null default 'clientes';

-- Solo valores válidos.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'announcements_audience_chk'
  ) then
    alter table public.announcements
      add constraint announcements_audience_chk
      check (audience in ('clientes', 'repartidores', 'ambos'));
  end if;
end $$;
