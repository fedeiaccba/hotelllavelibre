# Activar usuarios y permisos por hotel

El codigo nuevo utiliza Supabase Auth. El login demo anterior de la tabla
admin_users deja de ser valido al activar esta version. El modo local de
demostracion (VITE_DEMO_MODE=true) sigue separado y no accede a la base.

## Preparar las cuentas

1. En el mismo proyecto Supabase, abrir Authentication > Users > Add user >
   Create new user. Crear una cuenta para administracion general y otra para
   recepcion, con emails distintos y contrasenas propias. Confirmar los usuarios
   (opcion Auto Confirm User si aparece). No compartir las contrasenas por chat.
2. En `supabase/VINCULAR_USUARIOS_AUTH.sql`, completar v_admin_email y v_hotel_email
   con esos emails y ejecutar el archivo en SQL Editor. Conserva los perfiles,
   sus roles, el hotel asignado y el historial; solo cambia los emails demo.
3. Alternativa: si las cuentas Auth ya tienen exactamente los mismos emails que
   los perfiles existentes, omitir el archivo de vinculacion. Las contrasenas
   siempre son las nuevas de Auth, nunca se importan desde la tabla.
4. Desactivar el registro publico de cuentas en Authentication > Sign In / Providers
   si no se necesita para otro uso del proyecto. Los huespedes no necesitan cuenta.
   Un registro Auth por si solo nunca concede un rol ni acceso al panel.

## Aplicar la migracion y activar el codigo

Respaldar la base antes de actualizar. Coordinar una ventana de mantenimiento:
la version antigua del frontend no es compatible con estos permisos nuevos.
Preparar primero un build del codigo nuevo, aplicar el SQL y publicar ese build
inmediatamente despues. No volver a publicar el login antiguo.

Ejecutar completo en SQL Editor:

`supabase/migrations/20261031_auth_and_permissions.sql`

La migracion es transaccional y repetible. Si no hay un superadmin Auth
confirmado y vinculado, se detiene sin aplicar cambios. Cuando termina:

- Vincula perfiles con auth.users por email confirmado, conservando sus IDs.
- Elimina la columna password de admin_users.
- Sustituye las politicas abiertas por permisos por rol y hotel.
- Publica un catalogo sin comisiones ni datos de huespedes.
- Calcula precios y reparto de solicitudes en servidor.
- Registra efectivo mediante una funcion atomica con actor y auditoria privada.
- Bloquea modificaciones directas a ventas y roles desde el navegador.

No ejecutar INSTALAR_PRUEBAS.sql ni schema.sql despues: reabririan permisos de
demo si no existiera el bloqueo agregado. El instalador nuevo ya detecta Auth y
rechaza esa operacion; evitar tambien versiones anteriores de esos scripts.

El SQL se probo con PostgreSQL embebido y las llamadas Auth de navegador con
respuestas simuladas. No se ejecuto automaticamente en el proyecto remoto.
Este paso requiere privilegios de SQL Editor; la publishable key no los tiene.

## Comprobar el resultado

1. Abrir /admin/login y entrar con la cuenta y contrasena nuevas de Auth.
2. Recepcion debe ver solo su hotel y sus reservas. El administrador general
   puede ver la red y asignar accesos.
3. En una ventana privada abrir el catalogo, solicitar una reserva y generar
   el cupon. No debe ser posible listar las ventas ni las comisiones por REST.
4. Confirmar y cobrar desde recepcion. Una segunda confirmacion del cobro debe
   ser rechazada; paid_at y collected_by deben conservar el primer registro.
5. Salir y abrir /admin otra vez: debe pedir login. La antigua sesion
   gringacho_admin_session no concede acceso a la base ni al panel real.

## Administrar nuevos accesos

Crear primero la cuenta confirmada en Authentication. Desde Roles y accesos,
el superadmin vincula ese email, el nombre, el rol y el hotel. Los passwords
se administran en Auth y no se leen ni editan en las tablas de la app.
No se permite eliminar o quitar el rol del propio superadmin en uso.
Poner un perfil en Borrador revoca sus permisos de datos aunque conserve un JWT.

## Alcance

Esta etapa cubre identidad, aislamiento entre hoteles, privacidad del catalogo
y operaciones de reserva/cobro autorizadas. No activa pagos online, integraciones
de proveedores, MFA, recuperacion de password desde la app ni controles de abuso
para solicitudes anonimas. Esas capacidades necesitan su propia implementacion.
Los horarios solicitados se interpretan en time_zone del hotel (Europe/Lisbon
por defecto). Los alquileres se facturan por periodos iniciados de 24 horas.
El borrador payment-webhook ahora responde 503 sin modificar ventas. Si se
habia desplegado una version anterior, retirarla o desplegar ese stub tambien;
la migracion SQL por si sola no revoca un backend que use service_role.

Fuentes:
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/reference/javascript/auth-onauthstatechange
