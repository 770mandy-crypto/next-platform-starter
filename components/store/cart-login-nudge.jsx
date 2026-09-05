'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isSupabaseConfigured } from 'lib/supabase/config';
import { createClient } from 'lib/supabase/client';

// So a purchase actually gets remembered for next time — the webhook also
// retro-links a guest order by matching email, but signing in first is what
// makes /store/account show it immediately.
export function CartLoginNudge() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
  }, []);

  if (user || user === undefined) return null;

  return (
    <p className="auth-copy" style={{ margin: '0 0 1rem', fontSize: '0.85rem' }}>
      <Link href="/store/login" style={{ color: 'var(--gold)' }}>
        התחברו
      </Link>{' '}
      כדי שההזמנה תישמר בחשבון שלכם לפעם הבאה.
    </p>
  );
}
