-- Recalibración de la economía de puntos para márgenes ajustados (1–2%).
--
-- Antes: 1 punto por cada $1 enviado + valor $0.05/punto = se devolvía el 5%
-- de TODO el volumen, lo que deja pérdida cuando la comisión es menor al 5%.
--
-- Ahora: 1 punto por cada $5 enviados (points_per_usd = 0.2). Así el cliente
-- necesita mover más dinero para acumular la misma cantidad de puntos, y con
-- el mínimo de canje (100 pts) debe enviar ~$500 antes de su primer descuento.
-- El tope del 50% de la comisión por pedido (redeem_max_pct) sigue como red de
-- seguridad para que la casa nunca pierda en un canje.
--
-- Idempotente y conservador: solo baja los negocios que aún están en el valor
-- por defecto viejo (1 o nulo); si el operador ya lo personalizó, no se toca.

alter table public.business_settings
  alter column points_per_usd set default 0.2;

update public.business_settings
  set points_per_usd = 0.2
  where points_per_usd is null or points_per_usd = 1;
