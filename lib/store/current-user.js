import { isSupabaseConfigured } from 'lib/supabase/config';
import { createServerSupabaseClient } from 'lib/supabase/server';

// Reads who's signed in (if anyone) plus their admin flag, for server components
// and route handlers. Returns nulls rather than throwing when Supabase isn't
// configured yet, so pages can still render a "set this up" notice.
export async function getCurrentUser() {
  if (!isSupabaseConfigured) {
    return { user: null, profile: null };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return { user, profile: profile || null };
}
