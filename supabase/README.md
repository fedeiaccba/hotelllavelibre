# Armar Supabase para LlaveLibre

Esta guia conecta la version actual para pruebas de catalogo, reservas y cobros
de ejemplo. El SQL incluye usuarios demo y acceso publico a las tablas para
mantener compatibilidad con el login actual. No usar datos personales reales
ni dinero real: antes de publicar se debe migrar a Supabase Auth y restringir
las politicas por hotel y rol. Cambiar el password demo no cierra esos permisos.

## 1. Crear o elegir el proyecto

1. Entrar en https://supabase.com/dashboard e iniciar sesion.
2. Si no hay un proyecto para esta app, elegir New project, una organizacion,
   un nombre (por ejemplo llave-libre-pruebas), una clave de base de datos y
   una region cercana a los usuarios. Esperar a que termine de crearse.
3. Si ya hay uno, abrirlo y revisar Table Editor. No borrar tablas ni ejecutar
   reset.sql para intentar resolver un error.

La clave de base de datos se conserva de forma privada. La app del navegador
no usa esa clave ni la cadena de conexion Postgres.

## 2. Instalar tablas y ejemplos

En el proyecto elegido: SQL Editor > New query. Pegar y ejecutar completo:

**supabase/INSTALAR_PRUEBAS.sql**

El archivo incluye el schema actual, los campos de cupones, los permisos de
prueba, un hotel, dos usuarios y tres servicios de ejemplo. Usa una transaccion
y no borra tablas, reservas ni servicios. No modifica el password de usuarios
que ya existen ni las tarifas de servicios con el mismo titulo en ese hotel.
Si la base ya tiene datos importantes, respaldarla antes de actualizarla.

No hace falta ejecutar aparte la migracion 20261031_booking_workflow.sql:
la instalacion completa ya incluye sus columnas. Esa migracion se conserva
para actualizar instalaciones anteriores que ya tienen tablas.

Para regenerar el archivo completo despues de cambiar el schema o los ejemplos:

```powershell
npm run supabase:prepare
```

Si falla el SQL, revisar el mensaje y la linea. La transaccion completa se
revierte al fallar. No resolverlo borrando datos.

## 3. Verificar el SQL

Abrir otra consulta y ejecutar **supabase/verificar.sql**. Para una base nueva:

| Tabla | Filas esperadas |
| --- | ---: |
| hotels | 1 |
| admin_users | 2 |
| recommendations | 3 |
| events | 1 |
| sales | 0 |

La segunda consulta debe listar 12 columnas de reserva. La tercera debe
devolver cero servicios con reparto incorrecto. Si habia datos, los conteos
pueden ser mayores. sales pasa a tener filas cuando un huesped solicita algo.

## 4. Conectar la app

En Supabase abrir **Connect**, seleccionar React y obtener **Project URL** y
**Publishable key**. Tambien se pueden consultar las claves en Settings > API Keys.
Para este frontend no usar secret key, service_role ni la clave de la base.

El proyecto ya tiene .env.local. Completarlo con los valores del proyecto elegido;
la plantilla .env.example muestra los nombres exactos. No publicar el archivo.

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU-CLAVE-PUBLISHABLE
VITE_DEMO_MODE=false
```

La URL es la URL HTTPS del proyecto, sin /rest/v1 ni rutas del dashboard.
Una clave anon de proyectos anteriores tambien se admite, pero preferir la
publishable al configurar un proyecto nuevo.

## 5. Iniciar sin modo demo

Desde la raiz del proyecto, en PowerShell:

```powershell
$env:VITE_DEMO_MODE = 'false'
npm run dev -- --host 127.0.0.1 --port 5176
```

La variable del proceso prevalece sobre .env.local: el primer comando evita
heredar el modo demo de otra terminal. Reiniciar Vite al cambiar .env.local.
Usar la URL exacta que informe Vite si el puerto esta ocupado.

La demo anterior en localhost:5175 sigue separada; no sirve para comprobar la
conexion real. Sus reservas locales no se transfieren automaticamente a Supabase.

## 6. Entrar y probar el circuito

1. Abrir http://127.0.0.1:5176/admin/login.
2. Para recepcion: hotel@demo.com / 123456.
3. Para administracion general: admin@demo.com / 123456.
4. Si habia una sesion local anterior, salir e ingresar de nuevo: los usuarios
   reales de la base tienen identificadores distintos de los del modo demo.
5. El panel debe mostrar Base de datos conectada y cargar el hotel/servicios.
   Esa etiqueta indica configuracion presente; la carga exitosa de datos y
   el guardado de una reserva comprueban efectivamente la conexion.
6. Abrir http://127.0.0.1:5176/h/hotel-atlantico-albufeira.
7. En la excursion demo, pedir una fecha futura y generar el cupon. Usar nombre
   y contacto ficticios. Una persona: EUR 60 = empresa 40 + recepcion 10 + sistema 10.
8. En el panel buscar ese codigo. Confirmar disponibilidad solo como prueba
   (no hay conexion con la empresa); despues registrar Recibir efectivo.
9. Actualizar la pagina y comprobar que sigue cobrada y no permite cobrar otra vez.
10. En Table Editor > sales debe existir la reserva con booking_code, status
    Cobrado y paid_at. Ningun dinero se mueve al realizar esta prueba.

Si los usuarios ya existian, conservan sus claves anteriores: el instalador
no cambia passwords. Las cuentas son de la tabla admin_users; esta version
todavia no inicia sesion con Authentication > Users.

## 7. Problemas habituales

| Sintoma | Comprobar |
| --- | --- |
| Sigue diciendo modo local o demo | VITE_DEMO_MODE=false y reiniciar el proceso correcto |
| Invalid API key o 401 | URL y clave pertenecen al mismo proyecto; usar publishable/anon |
| relation/column does not exist o schema cache | Ejecutar el instalador completo en ese mismo proyecto |
| permission denied o 403 | Revisar permisos/politicas del proyecto; el instalador incluye los de prueba |
| El catalogo esta vacio | Confirmar tres filas de recommendations con hotel_id, Publicado y bookable |
| Login incorrecto | Las cuentas existentes no cambian de password al repetir el SQL |
| No deja recibir efectivo | Confirmar disponibilidad; el cupon no debe estar vencido ni cobrado |

## Lo que esta instalacion no activa

No requiere instalar Supabase CLI, desplegar Edge Functions, configurar Storage
ni webhooks para probar el flujo de efectivo. Las imagenes son URLs de ejemplo.
Online y sincronizacion de cupos con empresas siguen pendientes. No desplegar el
borrador payment-webhook como si fuera una integracion de pago terminada.

## Fuentes oficiales

- https://supabase.com/docs/guides/getting-started/quickstarts/reactjs
- https://supabase.com/docs/guides/getting-started/api-keys

Guia revisada el 31/10/2026. Los ejemplos y SQL corresponden al codigo local.
