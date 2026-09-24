import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/heebo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { LocationProvider } from '@/lib/location';
import { usePushNotifications } from '@/lib/notifications';
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
  const segments = useSegments();
  usePushNotifications(userId);
  useLiveNotifications(userId);

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
