-- Nota libre por beneficiario en la libreta del cliente. Sirve para recordar
-- detalles de esa persona ("recibe en CUP", "edificio azul, 2do piso",
-- "avisar antes por WhatsApp") que se reaprovechan en cada envío.
-- Idempotente.

alter table public.client_saved_beneficiaries
  add column if not exists note text;

comment on column public.client_saved_beneficiaries.note is
  'Nota libre del cliente sobre este beneficiario (recordatorios de entrega).';
