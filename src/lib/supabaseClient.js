import { createClient } from '@supabase/supabase-js';

const env = import.meta.env;

// El cliente agrega "/rest/v1" por su cuenta. Si la URL viene con ese tramo o con
// barras al final (error común al copiarla), lo limpiamos para no duplicar el path.
const supabaseUrl = (env.VITE_SUPABASE_URL || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/i, '')
  .replace(/\/+$/, '');
// Aceptamos distintos nombres de variable para la clave pública/anon.
const supabaseKey = (
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

if (typeof window !== 'undefined') {
  // Para verificar desde la consola del navegador si se está usando la base real.
  console.info(
    isSupabaseConfigured
      ? '[LlaveLibre] Conectado a Supabase — la base de datos es la fuente de verdad.'
      : '[LlaveLibre] Sin credenciales de Supabase — usando datos locales (localStorage).',
  );
}
