import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerPushToken } from './api';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function openFromData(data: Record<string, unknown> | undefined) {
  if (!data) return;
  if (typeof data.conversation_id === 'string') router.push(`/chat/${data.conversation_id}`);
  else if (typeof data.item_id === 'string') router.push(`/item/${data.item_id}`);
}

/** Asks for permission once signed in, registers the device, and routes taps. */
export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId || Platform.OS === 'web' || !Device.isDevice) return;
    let cancelled = false;
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'הודעות',
          importance: Notifications.AndroidImportance.HIGH,
        });
        await Notifications.setNotificationChannelAsync('alerts', {
          name: 'התראות על פריטים חדשים',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
      if (status !== 'granted' || cancelled) return;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) return; // push needs an EAS project id (see README)
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (!cancelled) await registerPushToken(token, Platform.OS);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const last = Notifications.getLastNotificationResponse();
    if (last) openFromData(last.notification.request.content.data);
    const sub = Notifications.addNotificationResponseReceivedListener((response) =>
      openFromData(response.notification.request.content.data),
    );
    return () => sub.remove();
  }, []);
}
