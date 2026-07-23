-- =============================================================
-- Giro — Enlazar el cliente de agenda a la CUENTA real del cliente
-- Al aceptar un pedido, el cliente de agenda se busca/crea por user_id (la
-- cuenta del cliente), no por teléfono. Así dos personas distintas nunca se
-- fusionan aunque compartan número.
-- Ejecuta después de 0022. Idempotente.
-- =============================================================

alter table public.clients add column if not exists user_id uuid;
create index if not exists clients_user_idx
  on public.clients (operator_id, user_id);
