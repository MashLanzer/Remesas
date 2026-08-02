-- Perfil de cliente más completo: un segundo teléfono (por si no contestan el
-- principal) y una dirección/ciudad de contacto en EE. UU. Son datos que el
-- negocio puede necesitar para coordinar el pago o localizar al cliente.
-- Idempotente: se puede correr varias veces sin romper nada.

alter table public.profiles
  add column if not exists phone2 text,
  add column if not exists address text;

comment on column public.profiles.phone2 is 'Segundo teléfono / WhatsApp de contacto del cliente.';
comment on column public.profiles.address is 'Dirección o ciudad del cliente (contacto).';
