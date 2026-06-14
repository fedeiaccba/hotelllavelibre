# Supabase setup

La app usa Supabase como base de datos. Si hay credenciales, **la base es la única
fuente de verdad**: todas las operaciones del panel (hoteles, servicios, eventos,
usuarios y cobros) golpean Supabase y, si algo falla, el error se ve en pantalla.
Si NO hay credenciales, la app cae a `localStorage` con datos de ejemplo (modo demo).

## 1. Crear las tablas

En Supabase → **SQL Editor** → pegar y ejecutar todo el contenido de
[`supabase/schema.sql`](./schema.sql). Es idempotente y auto-reparable (agrega
columnas faltantes; se puede correr varias veces).

> **¿Te dio un error tipo `column "location" of relation "hotels" does not exist`?**
> Tu proyecto tiene tablas viejas de otra versión que chocan. Estás en setup, así que
> lo más simple es: ejecutá primero [`supabase/reset.sql`](./reset.sql) (borra esas
> tablas y sus datos) y después [`supabase/schema.sql`](./schema.sql) para crear todo
> limpio.

Crea/actualiza:

- `admin_users` — usuarios del panel (super admin / hotel admin)
- `hotels` — incluye `auto_charge` (cobro automático/manual)
- `recommendations` — servicios; incluye `bookable`, `price`, `commission`, `provider`, `payment_url`
- `events`
- `sales` — cobros y comisiones
- índices, triggers de `updated_at` y políticas RLS demo (abiertas, para desarrollo)

## 2. Configurar variables

`.env.local` en la raíz del proyecto:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-publishable-o-anon-key
```

> Reiniciá Vite después de crear o cambiar `.env.local`.
> Para verificar el modo, abrí la consola del navegador: dice
> "Conectado a Supabase" o "usando datos locales".

## 3. Primer acceso (bootstrap)

El schema crea un usuario inicial para poder entrar:

- `admin@demo.com` / `123456` (super admin)

**Cambialo apenas entres** (creá tu usuario real desde el panel y borrá/cambiá el demo,
o actualizalo por SQL):

```sql
update public.admin_users
set email = 'tu@email.com', password = 'una-clave-fuerte'
where email = 'admin@demo.com';
```

## 4. Seguridad (importante para producción)

La demo guarda contraseñas en texto plano y las políticas RLS son abiertas, así que
con la clave pública se pueden leer los `admin_users`. Para producción conviene:

- Migrar el login a **Supabase Auth** (o a una Edge Function), y no guardar contraseñas en la tabla.
- Cerrar las políticas RLS por rol/claims.

Puedo ayudarte a hacer esa migración cuando quieras.

## 5. Cobro automático (opcional, verificado)

`supabase/functions/payment-webhook/index.ts` confirma cobros cuando el proveedor de
pago avisa que el pago se acreditó. Es opcional: el modo "Automático" del panel ya
marca el cobro al pagar (optimista) sin necesidad del webhook.

## 6. Archivos principales

- Cliente Supabase: `src/lib/supabaseClient.js`
- Servicio CRUD: `src/services/adminDataService.js`
- Panel admin: `src/components/admin/AdminDashboard.jsx`
- Login: `src/components/admin/AdminLogin.jsx`
