import { getSessionUser, clearSessionUser, setSessionUser } from '../data/adminMock';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export async function getAuthenticatedAdmin() {
  if (!isSupabaseConfigured) return getSessionUser();
  clearSessionUser();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await supabase.from('admin_users')
    .select('id,auth_user_id,name,email,role,hotel_id,status')
    .eq('auth_user_id', user.id).eq('status', 'Activo').maybeSingle();
  if (profileError) throw new Error('No se pudo verificar tu acceso. Revisá la configuración de usuarios con el administrador.');
  if (!profile || !['super_admin', 'hotel_admin'].includes(profile.role) ||
    (profile.role === 'hotel_admin' && !profile.hotel_id)) {
    throw new Error('Tu cuenta no tiene un acceso activo asignado. Contactá al administrador.');
  }
  return { id: profile.id, authUserId: user.id, name: profile.name, email: profile.email,
    role: profile.role, hotelId: profile.hotel_id, status: profile.status };
}

export async function signOutAdmin() {
  clearSessionUser();
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }
}

export function saveDemoSession(user) {
  if (!isSupabaseConfigured) setSessionUser(user);
}
