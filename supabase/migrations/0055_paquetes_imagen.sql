-- Foto opcional para los paquetes de remesa (igual que las promociones/ofertas).
--
-- La imagen se sube al bucket público "receipts" (ruta packages/…) y aquí se
-- guarda solo la URL pública. Si no hay foto, la columna queda en NULL y el
-- paquete cae al emoji como hasta ahora. Tolerante y opcional.

alter table public.remittance_packages add column if not exists image_url text;
