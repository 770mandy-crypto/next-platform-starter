export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True once the store owner has created a Supabase project and set the env vars.
// Every /store page checks this first so a missing setup step shows a clear notice
// instead of a crash.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
