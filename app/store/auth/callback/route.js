import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from 'lib/supabase/server';

// Supabase redirects here after Google sign-in with a one-time `code`. Trading it
// for a session is what actually logs the visitor in.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/store';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/store/login?error=auth`);
}
