import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { supabase, unwrap } from './supabase';
import type { Profile } from './types';

WebBrowser.maybeCompleteAuthSession();

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  userId: string | null;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
  sendEmailCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Resolves true when signed in; otherwise opens the sign-in screen. */
  requireAuth: () => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

// Where the OAuth provider sends the browser back to: the app's own scheme on
// a phone (giveback://auth/callback), the current site on the web.
export function oauthRedirectUrl() {
  if (Platform.OS === 'web') return typeof window === 'undefined' ? '' : `${window.location.origin}/auth/callback`;
  return makeRedirectUri({ scheme: 'giveback', path: 'auth/callback' });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setProfile(data as Profile | null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // A profile left over from a previous account is never shown.
  const currentProfile = profile && profile.id === userId ? profile : null;

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = oauthRedirectUrl();
    if (Platform.OS === 'web') {
      unwrap(await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }));
      return false; // the page navigates away to Google
    }
    const { url } = unwrap(
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
      }),
    );
    const result = await WebBrowser.openAuthSessionAsync(url!, redirectTo);
    if (result.type !== 'success') return false;
    const code = new URL(result.url).searchParams.get('code');
    if (!code) throw new Error('ההתחברות עם Google לא הושלמה');
    unwrap(await supabase.auth.exchangeCodeForSession(code));
    return true;
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('לא התקבל אישור מ-Apple');
      const { user } = unwrap(
        await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken }),
      );
      // Apple shares the name only on the very first sign-in; keep it.
      const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
      if (name && user) await supabase.from('profiles').update({ display_name: name }).eq('id', user.id);
      return true;
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
      throw error;
    }
  }, []);

  const sendEmailCode = useCallback(async (email: string) => {
    unwrap(await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } }));
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    unwrap(await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' }));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const requireAuth = useCallback(() => {
    if (userId) return true;
    router.push('/sign-in');
    return false;
  }, [userId]);

  const value = useMemo(
    () => ({
      session,
      profile: currentProfile,
      loading,
      userId,
      refreshProfile,
      signInWithGoogle,
      signInWithApple,
      sendEmailCode,
      verifyEmailCode,
      signOut,
      requireAuth,
    }),
    [
      session,
      currentProfile,
      loading,
      userId,
      refreshProfile,
      signInWithGoogle,
      signInWithApple,
      sendEmailCode,
      verifyEmailCode,
      signOut,
      requireAuth,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
