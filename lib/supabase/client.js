'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseUrl, supabaseAnonKey } from './config';

// One client per browser tab. Used from client components (e.g. the "sign in with
// Google" button) that need to read the session or trigger the OAuth redirect.
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
