import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Divider, EmptyState, Loading, Text, type IconName } from '@/components/ui';
import { listNotifications, markAllNotificationsRead } from '@/lib/api';
import { timeAgo } from '@/lib/time';
import type { Notification } from '@/lib/types';
import { colors, space } from '@/theme';

const ICONS: Record<Notification['kind'], IconName> = {
  message: 'chatbubble-ellipses',
  status: 'swap-horizontal',
  alert: 'notifications',
  thanks: 'heart',
  community: 'people',
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: listNotifications });

  useEffect(() => {
    if (!data) return;
    markAllNotificationsRead().then(() => queryClient.invalidateQueries({ queryKey: ['unread-notifications'] }));
  }, [data, queryClient]);

  if (isLoading) return <Loading />;
  return (
    <FlatList
      data={data}
      keyExtractor={(n) => String(n.id)}
      ItemSeparatorComponent={Divider}
      contentContainerStyle={{ maxWidth: 760, width: '100%', alignSelf: 'center' }}
      ListEmptyComponent={
        <EmptyState
          icon="notifications-off-outline"
          title="אין עדכונים"
          body="כאן יופיעו הודעות, התראות חיפוש ותודות."
        />
      }
      renderItem={({ item: n }) => (
        <Pressable
          onPress={() => {
            if (n.data.conversation_id) router.push(`/chat/${n.data.conversation_id}`);
            else if (n.data.item_id) router.push(`/item/${n.data.item_id}`);
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            gap: space.md,
            padding: space.lg,
            backgroundColor: pressed ? colors.primarySoft : n.read_at ? colors.card : '#F4FBF7',
          })}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name={ICONS[n.kind]} size={20} color={n.kind === 'thanks' ? colors.accent : colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text weight="bold">{n.title}</Text>
            {!!n.body && (
              <Text variant="label" color={colors.muted} numberOfLines={2}>
                {n.body}
              </Text>
            )}
            <Text variant="caption" color={colors.faint}>
              {timeAgo(n.created_at)}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}
