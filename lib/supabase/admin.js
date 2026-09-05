import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from './config';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseAdminConfigured = Boolean(supabaseUrl && serviceRoleKey);

// Bypasses row-level security. Server-only: never import this from a client
// component, and never send SUPABASE_SERVICE_ROLE_KEY to the browser. Used for the
// writes a shopper or the admin UI should never be able to trigger directly —
// creating orders, marking them paid, decrementing stock.
export function createAdminSupabaseClient() {
  if (!isSupabaseAdminConfigured) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not set.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
