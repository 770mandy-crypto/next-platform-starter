import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/item-card';
import { Avatar, Button, Divider, EmptyState, Loading, Text } from '@/components/ui';
import { listConversations } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { photoUrl } from '@/lib/supabase';
import { timeAgo } from '@/lib/time';
import { colors, radius, space } from '@/theme';

export default function Messages() {
  const { userId } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: listConversations,
    enabled: !!userId,
  });

  useFocusEffect(
    useCallback(() => {
      if (userId) refetch();
    }, [userId, refetch]),
  );

  if (!userId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <EmptyState
          icon="chatbubbles-outline"
          title="השיחות שלכם יופיעו כאן"
          body="התחברו כדי לכתוב למוסרים ולתאם איסוף."
          action={<Button title="התחברות" onPress={() => router.push('/sign-in')} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Text variant="title" style={{ paddingHorizontal: space.lg, paddingVertical: space.md }}>
        הודעות
      </Text>
      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={Divider}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="אין עדיין שיחות"
              body="מצאו משהו שאתם צריכים ולחצו ״אני רוצה״ — או פרסמו משהו למסירה."
              action={<Button title="לחיפוש" variant="secondary" onPress={() => router.navigate('/')} />}
            />
          }
          renderItem={({ item: c }) => (
            <Pressable
              testID={`conversation-${c.id}`}
              onPress={() => router.push(`/chat/${c.id}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                gap: space.md,
                padding: space.lg,
                backgroundColor: pressed ? colors.primarySoft : c.unread ? '#FBFFFC' : colors.card,
              })}>
              <View>
                <Avatar uri={c.other_avatar} name={c.other_name} size={50} />
                <View
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    end: -4,
                    width: 26,
                    height: 26,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: colors.card,
                    backgroundColor: colors.primarySoft,
                  }}>
                  {c.item_photo ? (
                    <Image source={{ uri: photoUrl(c.item_photo) }} style={{ flex: 1 }} />
                  ) : (
                    <Ionicons name="gift" size={16} color={colors.primary} style={{ margin: 3 }} />
                  )}
                </View>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                  <Text weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                    {c.other_name}
                  </Text>
                  <Text variant="caption" color={colors.faint}>
                    {timeAgo(c.last_message_at)}
                  </Text>
                </View>
                <Text variant="caption" color={colors.primary} numberOfLines={1}>
                  {c.role === 'giver' ? '🎁 את/ה מוסר/ת' : '🙋 את/ה מבקש/ת'} · {c.item_title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Text
                    variant="label"
                    weight={c.unread ? 'bold' : 'regular'}
                    color={c.unread ? colors.ink : colors.muted}
                    numberOfLines={1}
                    style={{ flex: 1 }}>
                    {c.last_sender_id === userId ? 'את/ה: ' : ''}
                    {c.last_message_preview}
                  </Text>
                  <StatusBadge status={c.item_status} />
                  {c.unread > 0 && (
                    <View
                      style={{
                        minWidth: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: colors.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 6,
                      }}>
                      <Text variant="caption" weight="bold" color={colors.white}>
                        {c.unread}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
