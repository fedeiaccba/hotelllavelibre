import { readFileSync, writeFileSync } from 'node:fs';

const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const seed = readFileSync(new URL('../supabase/seed-demo.sql', import.meta.url), 'utf8');
const output = new URL('../supabase/INSTALAR_PRUEBAS.sql', import.meta.url);
writeFileSync(output, [
  '-- ARCHIVO GENERADO: npm run supabase:prepare',
  '-- SOLO PRUEBAS. Incluye usuarios demo y permisos publicos abiertos.',
  '-- Ejecutar completo en SQL Editor. No borra tablas ni reservas.',
  'begin;', schema.trim(), seed.trim(),
  "notify pgrst, 'reload schema';", 'commit;', '',
].join('\n\n'));
console.log('Preparado: supabase/INSTALAR_PRUEBAS.sql');
