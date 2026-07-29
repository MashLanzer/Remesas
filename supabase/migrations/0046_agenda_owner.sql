-- =============================================================
-- Giro — Autoría de agenda (para aislar bien clientes/beneficiarios por repartidor)
-- Marca quién creó cada cliente/beneficiario. Un repartidor ve: los del negocio
-- (creados por el operador o sin autor), los suyos, y los de sus remesas — pero
-- NO los que creó otro repartidor. Tolerante: filas viejas (created_by nulo) se
-- tratan como compartidas del negocio.
-- Ejecuta después de 0045. Idempotente.
-- =============================================================

alter table public.clients add column if not exists created_by uuid;
alter table public.beneficiaries add column if not exists created_by uuid;
