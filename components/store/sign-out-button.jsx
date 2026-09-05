'use client';

import { useRouter } from 'next/navigation';
import { createClient } from 'lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  async function handleClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/store');
    router.refresh();
  }

  return (
    <button type="button" className="btn-line" onClick={handleClick}>
      התנתקות
    </button>
  );
}
