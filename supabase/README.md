# Supabase setup

Este proyecto ya tiene cliente y servicios CRUD listos para usar Supabase cuando existan credenciales.

## 1. Crear tablas

En Supabase, abrir SQL Editor y ejecutar:

```sql
-- copiar el contenido de supabase/schema.sql
```

El schema crea:

- `hotels`
- `recommendations`
- índices
- triggers de `updated_at`
- políticas RLS demo para poder leer/escribir desde la app Vite

Las políticas actuales son abiertas para desarrollo. Para producción conviene reemplazarlas por reglas basadas en Supabase Auth y claims de rol.

## 2. Configurar variables

Crear `.env.local` en la raíz:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Reiniciar Vite después de crear o cambiar `.env.local`.

## 3. Modo fallback

Si esas variables no existen, el admin usa `localStorage` con datos mock. Esto permite probar el CRUD sin backend real.

## 4. Archivos principales

- Cliente Supabase: `src/lib/supabaseClient.js`
- Servicio CRUD: `src/services/adminDataService.js`
- Panel admin: `src/components/admin/AdminDashboard.jsx`
- Login mock: `src/components/admin/AdminLogin.jsx`
