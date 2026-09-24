import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/heebo';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { I18nManager, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { CITIES } from '@/lib/catalog';
import { LocationProvider, useOrigin } from '@/lib/location';
import { usePushNotifications } from '@/lib/notifications';
import { isConfigured } from '@/lib/supabase';
import { useLiveNotifications } from '@/lib/realtime';
import { colors, fonts } from '@/theme';

// Hebrew everywhere. The expo-localization plugin forces RTL in native builds;
// this covers Expo Go during development.
if (Platform.OS !== 'web' && !I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function SessionEffects() {
  const { userId, profile } = useAuth();
  const { origin, ready, chooseCity } = useOrigin();
  const queryClient = useQueryClient();
  const previousUser = useRef(userId);
  const segments = useSegments();
  usePushNotifications(userId);
  useLiveNotifications(userId);

  // Switching accounts on a shared phone must never show the previous
  // person's chats or items, even for a moment. Restoring the session on
  // launch (no one → someone) is not a switch; signing out or into another
  // account is, and resets every query so open screens refetch as the new user.
  useEffect(() => {
    const previous = previousUser.current;
    previousUser.current = userId;
    if (previous && previous !== userId) queryClient.resetQueries();
  }, [userId, queryClient]);

  // Signing in on a new device: start from the city saved on the account.
  useEffect(() => {
    if (ready && !origin && profile?.city && CITIES.some((c) => c.name === profile.city)) chooseCity(profile.city);
  }, [ready, origin, profile, chooseCity]);

  // New accounts confirm their name and area once before anything else.
  useEffect(() => {
    if (profile && !profile.onboarded && segments[0] !== 'onboarding' && segments[0] !== 'legal') {
      router.replace('/onboarding');
    }
  }, [profile, segments]);
  return null;
}

export default function RootLayout() {
  const [loaded] = useFonts({ Heebo_400Regular, Heebo_500Medium, Heebo_700Bold, Heebo_800ExtraBold });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;
  if (!isConfigured) return <NotConfigured />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LocationProvider>
              <SessionEffects />
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17 },
                  headerBackButtonDisplayMode: 'minimal',
                  headerTintColor: colors.ink,
                  headerStyle: { backgroundColor: colors.bg },
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: colors.bg },
                }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="sign-in" options={{ presentation: 'modal', title: '' }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="item/[id]" options={{ title: '' }} />
                <Stack.Screen name="item/edit/[id]" options={{ title: 'עריכת פריט', presentation: 'modal' }} />
                <Stack.Screen name="chat/[id]" options={{ title: '' }} />
                <Stack.Screen name="user/[id]" options={{ title: '' }} />
                <Stack.Screen name="communities/index" options={{ title: 'קהילות' }} />
                <Stack.Screen name="communities/[id]" options={{ title: '' }} />
                <Stack.Screen name="communities/new" options={{ title: 'קהילה חדשה', presentation: 'modal' }} />
                <Stack.Screen name="alerts" options={{ title: 'התראות חיפוש' }} />
                <Stack.Screen name="notifications" options={{ title: 'עדכונים' }} />
                <Stack.Screen name="favorites" options={{ title: 'שמורים' }} />
                <Stack.Screen name="edit-profile" options={{ title: 'עריכת פרופיל', presentation: 'modal' }} />
                <Stack.Screen name="report" options={{ title: 'דיווח', presentation: 'modal' }} />
                <Stack.Screen name="legal/privacy" options={{ title: 'מדיניות פרטיות' }} />
                <Stack.Screen name="legal/terms" options={{ title: 'תנאי שימוש' }} />
                <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
              </Stack>
            </LocationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Shown when the build has no server settings yet, instead of a broken app.
// The website reads them from config.js; the phone apps get them at build
// time from the repository secrets.
function NotConfigured() {
  const web = Platform.OS === 'web';
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg }}>
      <Text style={{ fontFamily: fonts.black, fontSize: 28, color: colors.primary }}>GiveBack</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 16, textAlign: 'center' }}>
        {web ? 'האתר עוד לא מחובר לשרת' : 'האפליקציה עוד לא מחוברת לשרת'}
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.muted, marginTop: 8, textAlign: 'center' }}>
        {web
          ? 'פתחו את הקובץ config.js שבתיקיית האתר, הדביקו את כתובת הפרויקט והמפתח מ-Supabase, והעלו את האתר מחדש.'
          : 'זו גרסת ניסיון. אחרי שמחברים את השרת (Supabase) יוצאת גרסה חדשה — מתקינים אותה מעל זו, והכול עובד.'}
      </Text>
    </View>
  );
}
