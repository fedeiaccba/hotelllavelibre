-- LlaveLibre — reset.sql
-- ⚠️ ATENCIÓN: borra las tablas de la app y TODOS sus datos.
-- Usalo solo en setup, o si el schema choca con tablas viejas de otra versión
-- (por ej. el error: column "location" of relation "hotels" does not exist).
--
-- Pasos:
--   1) Pegá y ejecutá este archivo en Supabase → SQL Editor.
--   2) Después ejecutá supabase/schema.sql (crea todo limpio + datos iniciales).

drop table if exists public.sales cascade;
drop table if exists public.events cascade;
drop table if exists public.recommendations cascade;
drop table if exists public.admin_users cascade;
drop table if exists public.hotels cascade;
