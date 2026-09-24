// Landing route for the OAuth redirect. On a phone the in-app browser usually
// hands the code straight back to signInWithGoogle(); this screen covers the
// cases where the redirect opens the app (or the web page) directly instead.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { Loading } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session && code) await supabase.auth.exchangeCodeForSession(code);
      router.replace('/');
    })();
  }, [code]);
  return <Loading />;
}
