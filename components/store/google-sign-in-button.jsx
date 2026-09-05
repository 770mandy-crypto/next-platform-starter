'use client';

import { useState } from 'react';
import { createClient } from 'lib/supabase/client';

export function GoogleSignInButton({ redirectTo = '/store' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/store/auth/callback?next=${encodeURIComponent(redirectTo)}`
      }
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <div className="google-auth">
      <button type="button" className="btn-google" onClick={handleClick} disabled={loading}>
        {loading ? 'מעביר לגוגל…' : 'המשך עם Google'}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
