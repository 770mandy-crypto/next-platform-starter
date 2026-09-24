import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, Field, Row, Text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, radius, space } from '@/theme';

export default function SignIn() {
  const { userId, signInWithGoogle, signInWithApple, sendEmailCode, verifyEmailCode } = useAuth();
  const [busy, setBusy] = useState<'google' | 'apple' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios')
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => {});
  }, []);

  // Leave as soon as a session exists, whichever method produced it.
  useEffect(() => {
    if (userId) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }
  }, [userId]);

  async function run(kind: 'google' | 'apple' | 'email', fn: () => Promise<unknown>) {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.xl, gap: space.xl, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: space.md, marginTop: space.lg }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 24,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="gift" size={44} color={colors.white} />
          </View>
          <Text variant="display" style={{ textAlign: 'center' }}>
            ברוכים הבאים
          </Text>
          <Text color={colors.muted} style={{ textAlign: 'center' }}>
            מה שכבר לא צריך — למישהו ממש קרוב. מתחברים פעם אחת, ומתחילים למסור ולקבל.
          </Text>
        </View>

        <View style={{ gap: space.md }}>
          <GoogleButton loading={busy === 'google'} onPress={() => run('google', signInWithGoogle)} />
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.md}
              style={{ height: 50 }}
              onPress={() => run('apple', signInWithApple)}
            />
          )}
        </View>

        <Row>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text variant="caption" color={colors.muted}>
            או עם אימייל
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </Row>

        {!codeSent ? (
          <View style={{ gap: space.md }}>
            <Field
              testID="email-input"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              style={{ textAlign: 'left', writingDirection: 'ltr' }}
            />
            <Button
              testID="send-code"
              variant="ghost"
              title="שלחו לי קוד כניסה"
              loading={busy === 'email'}
              disabled={!/.+@.+\..+/.test(email)}
              onPress={() =>
                run('email', async () => {
                  await sendEmailCode(email);
                  setCodeSent(true);
                })
              }
            />
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            <Text color={colors.muted}>שלחנו קוד בן 6 ספרות אל {email}</Text>
            <Field
              testID="code-input"
              placeholder="000000"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              style={{ textAlign: 'center', letterSpacing: 8, fontSize: 22 }}
            />
            <Button
              testID="verify-code"
              title="כניסה"
              loading={busy === 'email'}
              disabled={code.length !== 6}
              onPress={() => run('email', () => verifyEmailCode(email, code))}
            />
            <Button variant="ghost" size="sm" title="שינוי אימייל" onPress={() => setCodeSent(false)} />
          </View>
        )}

        {error && (
          <Text color={colors.danger} style={{ textAlign: 'center' }}>
            {error}
          </Text>
        )}

        <Text variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
          בהמשך את/ה מסכים/ה ל
          <Text variant="caption" color={colors.primary} onPress={() => router.push('/legal/terms')}>
            תנאי השימוש
          </Text>{' '}
          ול
          <Text variant="caption" color={colors.primary} onPress={() => router.push('/legal/privacy')}>
            מדיניות הפרטיות
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoogleButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <Button
      testID="google-sign-in"
      variant="light"
      size="lg"
      icon="logo-google"
      title="המשך עם Google"
      onPress={onPress}
      loading={loading}
    />
  );
}
