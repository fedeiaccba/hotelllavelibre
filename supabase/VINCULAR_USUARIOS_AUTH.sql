-- Paso previo a la migracion Auth, desde SQL Editor.
-- Crear primero estas dos cuentas confirmadas en Authentication > Users.
-- Cambiar SOLO los dos emails de abajo. No escribir contrasenas en este archivo.
begin;
do $$
declare
  v_admin_email text := 'CAMBIAR-ADMIN@ejemplo.invalid';
  v_hotel_email text := 'CAMBIAR-RECEPCION@ejemplo.invalid';
  affected integer;
begin
  if to_regprocedure('app_private.is_super_admin()') is not null then
    raise exception 'La migracion Auth ya esta aplicada. Administrar accesos desde el panel.';
  end if;
  v_admin_email := lower(trim(v_admin_email));
  v_hotel_email := lower(trim(v_hotel_email));
  if v_admin_email = v_hotel_email then raise exception 'Usar dos emails diferentes.'; end if;
  if (select count(*) from auth.users where lower(email) in (v_admin_email,v_hotel_email)
    and email_confirmed_at is not null) <> 2 then
    raise exception 'Crear y confirmar ambas cuentas en Authentication antes de continuar.';
  end if;
  update public.admin_users set email = v_admin_email
    where role = 'super_admin' and lower(email) in ('admin@demo.com',v_admin_email);
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'No se encontro un unico perfil administrador para vincular.'; end if;
  update public.admin_users set email = v_hotel_email
    where role = 'hotel_admin' and lower(email) in ('hotel@demo.com',v_hotel_email);
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'No se encontro un unico perfil recepcion para vincular.'; end if;
end $$;
commit;
