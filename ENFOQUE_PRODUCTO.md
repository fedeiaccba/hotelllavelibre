# Catalogo de experiencias y alquileres para huespedes

Revision del 31/10/2026 basada en las capturas de transcripciones de Fede,
el intercambio de WhatsApp y el codigo local. No se recibieron archivos de audio.
Este documento define el enfoque propuesto; no describe funciones ya terminadas.

## Primera implementacion local

La siguiente iteracion implementa login con Supabase Auth, permisos por hotel,
catalogo publico sin comisiones, reservas con tarifas calculadas en servidor y
cobros atomicos auditados. Su activacion remota requiere crear las cuentas Auth
y ejecutar `supabase/migrations/20261031_auth_and_permissions.sql`; ver
`supabase/SEGURIDAD_AUTH.md`. No se ejecuto esta migracion automaticamente.
Las referencias a login/RLS demo mas abajo describen la instalacion inicial.

Ya se implemento el recorrido de solicitud en efectivo: fechas, horario,
contacto, recogida y cupon descargable con codigo. En autos/motos se solicita
entrega/devolucion y se calcula por periodos iniciados de 24 horas.

Recepcion tiene una bandeja con busqueda, confirmacion manual de disponibilidad,
cancelacion y recepcion de efectivo. El cobro conserva la tarifa guardada y
rechaza una segunda confirmacion del mismo estado. Los cupones vencen a las
24 horas o al inicio solicitado, lo que ocurra antes. No bloquean inventario.

El pago online queda deshabilitado hasta disponer de integracion verificada.
Los cupones se descargan como texto; todavia no hay recuperacion publica por
enlace, notificaciones ni sincronizacion con proveedores. El QR del panel sigue
siendo una maqueta. La seccion de diagnostico inferior conserva la revision
inicial; varios problemas de interfaz ya fueron corregidos en esta iteracion.

Para una base existente aplicar la migracion
`supabase/migrations/20261031_booking_workflow.sql`. Se preparo el archivo, pero
no se ejecuto en Supabase. Las pruebas de navegador se realizaron en modo demo.
La autenticacion y las politicas abiertas existentes siguen siendo de demo;
antes de operar dinero real hace falta proteger y validar las operaciones en
servidor. La integracion de disponibilidad sigue pendiente de acuerdos/acceso.

## Objetivo

El huesped entra por un QR o link asociado al hotel, consulta excursiones y
alquileres, elige una salida o periodo y completa su reserva. Puede pagar online o generar un cupon
para pagar en efectivo. Recepcion encuentra esa reserva y registra la recepcion
del dinero con una accion, sin volver a cargar los datos ni calcular comisiones.

La coordinacion con la empresa debe tener un responsable y un mecanismo definido.
El catalogo por si solo no reemplaza la confirmacion de disponibilidad.

## Estado comprobado en el codigo

| Parte | Existe | Falta para el recorrido de Fede |
| --- | --- | --- |
| Catalogo | Fichas, fotos, precios, filtros y pagina por hotel | Priorizar excursiones y salidas reservables |
| Formulario | Nombre, habitacion y cantidad | Fecha, horario, contacto, recogida y disponibilidad |
| Eleccion de pago | Modo automatico/manual por hotel | El huesped elige online o efectivo entre las opciones habilitadas |
| Reserva | Registro en sales | Referencia publica, comprobante recuperable y estado de la empresa |
| Efectivo | Edicion manual del estado | Cupon unico, busqueda por codigo y accion Recibir efectivo |
| Pago online | Link externo y borrador de webhook | Crear pago asociado, verificarlo y conciliarlo sin duplicados |
| Comisiones | Empresa, recepcion y sistema | Validar reparto, conservar importes historicos y separar pendientes de cobradas |
| QR | Ruta publica del hotel y dibujo de ejemplo | QR escaneable real con atribucion al hotel |

El catalogo actual tambien incluye restaurantes, bares, traslados y autos.
Con las nuevas transcripciones, el alcance del producto incluye excursiones
variadas y alquileres de autos/motos. El primer recorrido operativo puede ser
una excursion, pero el modelo debe admitir diferentes reglas de disponibilidad.

| Servicio | Datos y disponibilidad necesarios |
| --- | --- |
| Excursion | Salida, horario, cupos y tarifas por tipo de pasajero |
| Auto o moto | Inicio/fin con hora, lugar de entrega/devolucion, categoria o unidad, tarifa y condiciones del proveedor |
| Traslado | Origen/destino, fecha/hora, pasajeros y vehiculo |

Mostrar una tarjeta de auto no significa tener un alquiler reservable.
Debe validarse disponibilidad para todo el periodo solicitado y contemplar
deposito, seguros y requisitos del conductor segun el proveedor.

## Recorrido propuesto

1. El huesped escanea el QR y queda asociado al hotel de origen.
2. Consulta excursiones con precio, duracion, empresa, punto de recogida,
   condiciones y salidas disponibles.
3. Elige fecha, horario y pasajeros; informa nombre, habitacion y contacto.
4. El sistema valida precio y disponibilidad y crea una reserva identificable.
5. Elige pago online o efectivo, segun las opciones habilitadas.
6. Recibe un comprobante con el estado real de reserva y pago.

### Efectivo

Se genera un cupon con codigo unico, excursion, salida solicitada, pasajeros,
hotel y total pendiente. Debe indicar si la empresa ya confirmo la salida.
El cupon acredita una solicitud/reserva, no que el dinero ya fue recibido.

Recepcion busca el codigo o escanea su QR, ve el importe y toca Recibir efectivo.
Se guardan fecha, importe y usuario que cobro. La operacion debe ser atomica:
dos clics, dos dispositivos o un reintento no pueden registrar dos cobros.
Los cupones vencidos, cancelados o ya pagados no se pueden cobrar nuevamente.
Una reserva vencida requiere revalidar disponibilidad antes de cobrar.

### Online

El servidor crea una sesion de pago para esa reserva con importe y moneda
calculados desde el catalogo. La reserva queda con pago pendiente.
Solo la confirmacion verificada del proveedor cambia el pago a cobrado.
Abrir un link o volver a la web no constituye una confirmacion.
Los avisos repetidos del proveedor deben tener un unico efecto.

La eleccion del proveedor de pago y la conexion de sus credenciales siguen
pendientes. El reparto contable no implica transferencias automaticas.

## Confirmacion de la empresa

Para que recepcion solo reciba efectivo, alguien mas debe resolver cupos,
horarios, recogida y cambios de la empresa.

Propuesta de inicio: las empresas o el administrador de la plataforma cargan
salidas y cupos previamente acordados. Si no se dispone de cupos garantizados,
la reserva queda como solicitada y la empresa o la plataforma debe confirmarla.
En ese caso, se propone cobrar despues de esa confirmacion.

Una integracion con el sistema de cada empresa puede automatizar esa parte
mas adelante. Enviar un WhatsApp no garantiza una plaza ni una respuesta.

## Referencia Pluralo y conexion con proveedores

Investigacion publica del 31/10/2026:

- [Pluralo](https://pluralo.com/) anuncia gestion de reservas, un widget de venta
  para otras webs, canales de venta y comisiones para agentes.
- [GetYourGuide](https://supply.getyourguide.support/hc/es-es/articles/14149999629853-Sistemas-compatibles-e-instrucciones)
  documenta una integracion con Pluralo con disponibilidad, precios y caducidad
  de reservas. Su activacion requiere contactar con Pluralo.

Esto sirve como referencia de funcionamiento. No demuestra que exista una API
publica abierta a nuestra plataforma ni acceso a todos los productos de Pluralo.
No se verifico en una cuenta/demo si admite alquileres de autos o motos;
la limitacion mencionada por Fede queda como observacion suya por confirmar.

Alternativas por proveedor:

1. Integracion autorizada: consultar salidas/precios, reservar cupo, confirmar
   o cancelar y guardar la referencia de la empresa. Pedir documentacion,
   credenciales de prueba y condiciones comerciales.
2. Widget o enlace de agente: el proveedor procesa la reserva. Verificar como
   devuelve confirmaciones y atribuye la comision; no asumir que soporta el
   cupon de efectivo ni el reparto propio de tres partes.
3. Cupos asignados: la empresa entrega un inventario exclusivo para nuestro
   canal. Un inventario cargado manualmente no representa automaticamente el
   total compartido de la pagina oficial.
4. Solicitud pendiente: cuando no hay conexion ni cupo garantizado, la empresa
   o la plataforma confirma antes de cobrar.

No hace falta que la empresa entregue una copia de su base de datos. Para
automatizar el ejemplo de 45 plazas hace falta una conexion soportada al sistema
que controla ese inventario. Consultar 45 plazas no las garantiza: hay que
revalidar y bloquear/reservar las solicitadas, si el proveedor admite ese paso.
Si no hay bloqueo temporal, definir el orden de reserva y pago y como resolver
un pago aprobado cuya reserva no pudo confirmarse.

Para efectivo, reservar una plaza mientras se espera el pago depende de lo que
permita la empresa. El cupon necesita vencimiento y liberacion de cupo, o debe
dejar explicito que la salida sigue pendiente de confirmacion.

Antes de elegir una integracion, reunir para cada empresa: web, sistema de
reservas, contacto comercial, forma de acceso como agente, operaciones
disponibles (consulta/reserva/cancelacion), condiciones de efectivo y regla de
comisiones. La facturacion y quien cobra al cliente requieren definir el
acuerdo comercial; el reparto interno por si solo no resuelve esas decisiones.

## Estados independientes

| Dimension | Estados propuestos |
| --- | --- |
| Reserva | Solicitada, confirmada, cancelada, vencida, realizada |
| Pago | Pendiente, cobrado, reembolsado |
| Liquidacion | Pendiente, parcial, liquidada |

Una reserva puede estar confirmada y pendiente de pago en efectivo.
Un pago cobrado puede estar pendiente de liquidar a la empresa y al sistema.
La politica de cancelacion determina devoluciones y ajustes de comisiones.

## Reparto e identificacion de la venta

Ejemplo de precio configurado por unidad:

| Destino | Importe |
| --- | ---: |
| Empresa | EUR 40 |
| Recepcion | EUR 10 |
| Sistema | EUR 10 |
| Total al huesped | EUR 60 |

Es un ejemplo, no una tarifa fija para todas las excursiones. Deben validarse
importes no negativos y que la suma coincida con el total. Las comisiones del
medio de pago necesitan una regla explicita sobre quien las absorbe.

Guardar en la reserva la tarifa y el reparto acordados. Una modificacion del
catalogo no debe cambiar cobros historicos. Mostrar por separado comisiones
previstas, respaldadas por cobros y efectivamente liquidadas.

El QR identifica el hotel de origen. Para atribuir la comision a una persona
concreta hacen falta enlaces por recepcionista o una regla acordada. La persona
que recibe efectivo puede ser distinta de quien origino la venta.

## Ajustes concretos detectados

- src/App.jsx puede crear Cobrado si el hotel esta en automatico sin link de pago.
- src/components/CheckoutModal.jsx ignora errores al guardar y muestra exito;
  tambien anuncia reserva confirmada antes de verificar pago o disponibilidad.
- Agregar sale_id/external_reference como parametros a un link generico no
  demuestra que el proveedor los devuelva asociados al pago.
- supabase/functions/payment-webhook/index.ts acepta el cuerpo del aviso sin
  verificar su firma, importe, moneda ni que corresponda a una reserva pagable.
  Es un borrador y no una integracion de pago lista.
- src/components/admin/AdminDashboard.jsx recalcula importes del catalogo al
  editar una venta: hoy la foto historica puede cambiar al confirmar un cobro.
- Los totales de comisiones incluyen reservas sin cobrar; hay que distinguirlos.
- src/App.jsx sustituye catalogos de menos de tres publicaciones por ejemplos;
  en el recorrido real deben mostrarse solo excursiones realmente disponibles.
- La autenticacion y las politicas abiertas del schema son de demostracion;
  el registro de cobros y las tarifas deben quedar protegidos en el servidor.

Estas observaciones se verificaron en los archivos locales. No se comprobo
el estado desplegado de Supabase ni de ningun proveedor de pago.

## Orden de implementacion

1. Catalogo de excursiones, salidas y reserva con identificacion del hotel,
   contacto y comprobante recuperable.
2. Cupon de efectivo y bandeja operativa de recepcion: buscar y recibir dinero.
   Conservar importes historicos y registrar quien cobro y cuando.
3. Pago online verificado, confirmacion de disponibilidad y tratamiento de
   vencimientos/cancelaciones. Habilitar online cuando la integracion este probada.
4. Liquidaciones de empresa, recepcion y sistema; atribucion por recepcionista
   si se acuerda que la comision es individual.

## Criterios para revisar la primera version

- El huesped termina una solicitud sin que recepcion vuelva a cargar sus datos.
- El cupon se recupera con su referencia y siempre muestra el estado vigente.
- Recepcion cobra un cupon valido una sola vez y por el importe registrado.
- Ninguna reserva aparece pagada por abrir un enlace o fallar el guardado.
- Cambiar una tarifa no modifica reservas/cobros ya registrados.
- Se conoce quien confirma cupos y horarios antes de prometer una salida.
- Empresa, recepcion y sistema suman el total y sus pendientes son distinguibles.
