# LlaveLibre · Rediseño "The Doorman" + Cobros y comisiones

## 1. Estética "The Doorman"

Se reemplazó la paleta lavanda/violeta por la de un conserje de hotel de lujo:

- **Borgoña** `#6e1f2c` (acento principal), **dorado antiguo** `#c49a3f` / `#e8c879`, **espresso** `#1a1210` y fondo **marfil** cálido.
- Tipografía display serif (**Playfair Display**) para la marca y los títulos; **Plus Jakarta Sans** para el cuerpo.
- Marca `LlaveLibre` rediseñada como placa borgoña→espresso con **llave dorada**, favicon a juego y `index.html` actualizado (título, descripción, `theme-color`).
- Se aplicó a **toda la app**: guía pública (huésped), panel admin y login.

Todo el reembrague vive en `src/index.css` (tokens + tipografías) y en los colores de cada componente.

## 2. Sistema de cobros y comisiones

Modelo elegido: **registro manual** del cobro por el recepcionista, **comisión fija por reserva** y moneda **euro (€)**. No hay pasarela de pago: el conserje cobra en recepción y el sistema calcula y acumula su comisión.

El catálogo dejó de ser "recomendaciones turísticas" y pasó a ser un **catálogo de servicios por tipo**: Restaurante, Bar, Excursión, Taxi y traslados, Alquiler de autos. El recepcionista gana una **comisión fija** cuando el huésped reserva/usa un servicio.

Cada servicio tiene: `bookable` (cobrable), `price` (precio al huésped, €), `commission` (comisión fija del recepcionista, **interna**), `provider` (proveedor/partner) y `paymentUrl` (link de pago opcional).

**El huésped (desde el teléfono):**
- Abre la web del hotel y ve los servicios. **La comisión nunca se le muestra**, solo el precio.
- El catálogo se ordena solo: primero los destacados y los que **más comisión dejan** (orden interno).
- Toca "Reservar y pagar €X" → completa nombre, habitación y cantidad → paga. Si el servicio tiene `paymentUrl` (Stripe/Mercado Pago), se abre el pago; si no, queda pendiente para que la recepción confirme.
- Cada reserva del huésped genera un cobro (estado **Pendiente**) que aparece en el panel.

**Panel admin → "Cobros y comisiones":**
- Totales: total cobrado, comisiones ganadas y comisión pendiente.
- Registro manual de cobro (recepción) y cobros generados por el huésped, juntos.
- El recepcionista ve los de su hotel; el super admin, los de toda la red.

**Formulario de servicio (admin):** tipo de servicio, precio, comisión, proveedor y **link de pago** (Stripe Payment Link / Mercado Pago). La comisión es interna.

## 3. Base de datos (Supabase)

`supabase/schema.sql` es idempotente. Para aplicar los cambios, corré el archivo completo en el SQL Editor de Supabase. Agrega:

- Columnas nuevas en `recommendations`: `bookable`, `price`, `commission`, `provider`, `payment_url`.
- Columna nueva en `hotels`: `auto_charge` (modo de cobro automático/manual).
- Tabla nueva `sales` (cobros) con índices, trigger de `updated_at` y políticas RLS demo.

Si trabajás en **modo mock local** (sin credenciales de Supabase) ya funciona: hay servicios y cobros de ejemplo en `src/data/`, y todo persiste en `localStorage`.

> **Pago online:** el huésped paga con un *link de pago* por servicio (lo creás en Stripe o Mercado Pago y lo pegás en el campo "Link de pago"). No hace falta backend ni claves secretas en el código.

## 4. Modo de cobro: automático o manual

Cada hotel elige su modo desde el panel (formulario del hotel → "Modo de cobro del huésped"):

- **Manual:** la reserva del huésped entra como **Pendiente** y la recepción la confirma a mano. La comisión se cuenta al confirmar.
- **Automático:** la reserva entra directo como **Cobrado** y la comisión se acredita sola, sin pasos manuales.

Para una confirmación **verificada** del pago (que el dinero entró de verdad), hay un webhook listo en `supabase/functions/payment-webhook/index.ts`: lo conectás a Stripe/Mercado Pago y, cuando llega el pago aprobado, marca la venta como Cobrado. Es opcional; el modo automático ya funciona sin él de forma optimista.

## 5. Ajustes visuales

- **Tipografía** más prolija: títulos y marca en *Cormorant Garamond*, cuerpo en *Inter*.
- **Botones**: se corregía el recorte de la sombra (lo causaba el `overflow-hidden` de la tarjeta) y ahora el fondo es un degradado borgoña más prolijo.
- Rendimiento: se quitaron los `backdrop-blur` pesados que trababan el scroll.

## 6. Base de datos: ahora es la fuente de verdad

Antes, si una operación contra Supabase fallaba, la app la guardaba en `localStorage`
en silencio: parecía que creabas usuarios/servicios pero no llegaban a la base.

Ahora, **si hay credenciales en `.env.local`, todo va a Supabase** (crear/editar/borrar
usuarios, hoteles, servicios, eventos y cobros, y el login). Si algo falla, el error
se muestra en el panel en vez de ocultarse. `localStorage` solo se usa cuando NO hay
credenciales (modo demo). El panel indica el estado: "● Base de datos conectada".

**Importante:** para que funcione, aplicá el schema en Supabase (ver `supabase/README.md`).
Si las tablas o policies no están, vas a ver el error exacto y sabrás qué corregir.

Se quitaron las credenciales demo de la pantalla de login. El acceso inicial sigue
siendo el usuario sembrado por el schema (`admin@demo.com` / `123456`): **cambialo
apenas entres** (ver `supabase/README.md`).

## 7. Cómo correr

```bash
npm install
npm run dev      # desarrollo
npm run build    # build de producción
```
