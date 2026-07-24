-- =============================================================
-- Giro — Motivo de rechazo de pedidos (opcional)
-- Guarda por qué el personal rechazó un pedido, para mostrárselo al cliente.
-- Ejecuta después de 0023. Idempotente.
-- =============================================================

alter table public.orders add column if not exists reject_reason text;
