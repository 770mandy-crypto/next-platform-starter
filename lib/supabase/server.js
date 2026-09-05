import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseUrl, supabaseAnonKey } from './config';

// Reads the signed-in user's session from cookies. Use this in server components
// and route handlers for anything that should respect row-level security as that
// specific user (catalog reads, "my orders").
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component that can't set cookies — fine, the
          // middleware-based refresh (if added later) or the next route handler
          // call will persist the session instead.
        }
      }
    }
  });
}
