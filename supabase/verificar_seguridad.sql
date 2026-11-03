-- Ejecutar solo en SQL Editor despues de la migracion Auth. Solo lectura.

-- Debe devolver 0: no quedan passwords en perfiles.
select count(*) as columnas_password from information_schema.columns
where table_schema='public' and table_name='admin_users' and column_name='password';

-- Debe haber al menos un superadmin activo con cuenta Auth vinculada.
select role, status, count(*) as perfiles, count(auth_user_id) as cuentas_auth_vinculadas
from public.admin_users group by role, status order by role, status;

-- Deben ser false: visitantes no pueden leer ni escribir tablas internas.
select t as tabla,
  has_table_privilege('anon', 'public.'||t, 'select') as lectura_anonima,
  has_table_privilege('anon', 'public.'||t, 'insert') as escritura_anonima
from unnest(array['admin_users','hotels','recommendations','events','sales']) t;

-- Deben ser false: ventas y roles solo cambian mediante funciones controladas.
select t as tabla,
  has_table_privilege('authenticated', 'public.'||t, 'insert') as insercion_directa,
  has_table_privilege('authenticated', 'public.'||t, 'update') as edicion_directa,
  has_table_privilege('authenticated', 'public.'||t, 'delete') as borrado_directo
from unnest(array['admin_users','sales']) t;

-- No debe haber politicas demo.
select tablename, policyname, roles, cmd from pg_policies
where schemaname='public' and tablename in ('admin_users','hotels','recommendations','events','sales')
order by tablename, policyname;

-- El catalogo publico no contiene campos de comisiones ni huespedes.
select public.get_public_catalog(null);
