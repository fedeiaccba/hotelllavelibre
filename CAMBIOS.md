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
- Tabla nueva `sales` (cobros) con índices, trigger de `updated_at` y políticas RLS demo.

Si trabajás en **modo mock local** (sin credenciales de Supabase) ya funciona: hay servicios y cobros de ejemplo en `src/data/`, y todo persiste en `localStorage`.

> **Pago online:** el huésped paga con un *link de pago* por servicio (lo creás en Stripe o Mercado Pago y lo pegás en el campo "Link de pago"). No hace falta backend ni claves secretas en el código. La recepción confirma el cobro cuando el pago se acredita.

## 4. Cómo correr

```bash
npm install
npm run dev      # desarrollo
npm run build    # build de producción
```

Usuarios demo: `admin@demo.com` / `123456` (super admin) · `hotel@demo.com` / `123456` (recepción).
