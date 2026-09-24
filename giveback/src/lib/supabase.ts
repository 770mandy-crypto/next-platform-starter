import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// The website reads its server settings at runtime from /config.js, so one
// build can be uploaded anywhere; the phone apps get them at build time.
type RuntimeConfig = { supabaseUrl?: string; supabaseAnonKey?: string };
const runtime: RuntimeConfig | undefined =
  typeof window === 'undefined' ? undefined : (window as { GIVEBACK_CONFIG?: RuntimeConfig }).GIVEBACK_CONFIG;

export const SUPABASE_URL = runtime?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = runtime?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_KEY || 'missing', {
  auth: {
    // Static web export renders once in Node, where there is no storage.
    storage: typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: typeof window !== 'undefined',
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

// Refresh tokens only while the app is in the foreground, as recommended for
// React Native, so a backgrounded app does not keep a timer running.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export function photoUrl(path: string | null | undefined) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/item-photos/${path}`;
}

// Database errors are raised in Hebrew by the SQL functions; anything else
// gets a generic message rather than leaking internals.
export function errorMessage(error: unknown) {
  const e = error as { message?: string; code?: string } | null;
  const msg = e?.message ?? '';
  if (/[א-ת]/.test(msg)) return msg;
  if (e?.code === 'PGRST301' || /JWT/.test(msg)) return 'פג תוקף החיבור, התחברו מחדש';
  if (/Failed to fetch|Network request failed/i.test(msg)) return 'אין חיבור לאינטרנט';
  return 'משהו השתבש, נסו שוב';
}

export function unwrap<R extends { data: any; error: unknown }>(result: R): R['data'] {
  if (result.error) throw new Error(errorMessage(result.error));
  return result.data;
}
