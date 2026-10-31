# React + Vite

## Reservas y cupones

El catalogo permite solicitar excursiones y alquileres y descargar un cupon
para pagar en efectivo. La bandeja `/admin` permite confirmar disponibilidad
con la empresa y registrar el efectivo recibido. Online sigue deshabilitado.

Para probar con datos locales, iniciar Vite con `VITE_DEMO_MODE=true` en el
entorno del proceso. No modifica las credenciales ni los datos de Supabase.
La demo usa localStorage y no comparte reservas entre dispositivos.

Para la base existente, aplicar
`supabase/migrations/20261031_booking_workflow.sql` en el SQL Editor.
No usar reset.sql. Esta migracion fue preparada, no aplicada por el agente.
El login y RLS existentes son de demostracion; no habilitar cobros reales sin
autorizacion y validacion de las operaciones en servidor.

Verificacion: `npm test`, `npm run lint`, `npm run build`.
Con la demo corriendo en localhost:5175: `npm run test:booking`.
Se puede cambiar el destino con la variable de entorno `TEST_URL`.

Detalle del producto: [ENFOQUE_PRODUCTO.md](./ENFOQUE_PRODUCTO.md).

////////
Deploy listo para Vercel con fallback de rutas internas como `/admin`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
