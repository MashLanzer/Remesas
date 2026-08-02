-- Eliminar cuenta del propio cliente (derecho a borrado). SECURITY DEFINER para
-- poder tocar auth.users y saltar RLS, pero SOLO sobre el usuario actual
-- (auth.uid()). Los pedidos NO se borran: son transacciones que el negocio
-- necesita para su contabilidad; se ANONIMIZAN (se quitan los datos personales
-- del cliente y se desvincula la cuenta). El resto de datos personales del
-- cliente sí se eliminan. reviews, client_saved_beneficiaries,
-- client_rate_alerts y client_send_reminders caen por ON DELETE CASCADE al
-- borrar el usuario; se limpian los que no cascadean (points_ledger). Idempotente.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;

  -- Anonimizar pedidos: se conserva la transacción, sin datos personales.
  update public.orders
     set client_id = null,
         client_name = 'Cuenta eliminada',
         client_phone = null
   where client_id = uid;

  -- Puntos del cliente (no cascadean): se eliminan.
  delete from public.points_ledger where client_id = uid;

  -- Beneficiarios guardados (cascadean, pero se limpian explícitamente).
  delete from public.client_saved_beneficiaries where user_id = uid;

  -- Perfil y usuario. Al borrar auth.users caen por cascade: profiles (si aplica),
  -- reviews, client_rate_alerts, client_send_reminders.
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end
$$;

grant execute on function public.delete_my_account() to authenticated;
revoke execute on function public.delete_my_account() from public, anon;
