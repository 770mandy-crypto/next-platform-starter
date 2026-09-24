import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { getProfiles, listCommunityMessages, sendCommunityMessage } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { clockTime } from '@/lib/time';
import type { CommunityMessage } from '@/lib/types';
import { colors, fonts, noOutline, radius, space } from '@/theme';

import { Avatar, Row, Text } from './ui';

// The community's own group chat — "who needs moving boxes?", "anyone going
// to the recycling centre?" — members only, live.
export function CommunityChat({ communityId, userId }: { communityId: string; userId: string }) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listCommunityMessages(communityId)
      .then((all) => active && setMessages(all))
      .catch((e) => active && setError((e as Error).message));
    const channel = supabase
      .channel(`community:${communityId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `community_id=eq.${communityId}` },
        (payload) => {
          const msg = payload.new as CommunityMessage;
          setMessages((all) => (all.some((m) => m.id === msg.id) ? all : [...all, msg]));
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  const senderIds = [...new Set(messages.map((m) => m.sender_id))].sort();
  const { data: people = [] } = useQuery({
    queryKey: ['profiles', senderIds.join(',')],
    queryFn: () => getProfiles(senderIds),
    enabled: senderIds.length > 0,
  });

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendCommunityMessage(communityId, userId, text);
      setMessages((all) => (all.some((m) => m.id === msg.id) ? all : [...all, msg]));
      setText('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      {messages.length === 0 && (
        <Text color={colors.muted}>עוד אין הודעות. אפשר לשאול, להציע, או סתם להגיד שלום לשכנים 👋</Text>
      )}
      {messages.map((m) => {
        const person = people.find((p) => p.id === m.sender_id);
        const mine = m.sender_id === userId;
        return (
          <Row key={m.id} style={{ alignItems: 'flex-start' }}>
            <Pressable onPress={() => router.push(`/user/${m.sender_id}`)}>
              <Avatar uri={person?.avatar_url} name={person?.display_name} size={32} />
            </Pressable>
            <View
              style={{
                flex: 1,
                backgroundColor: mine ? colors.primarySoft : colors.card,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: mine ? colors.primarySoft : colors.border,
                padding: space.sm,
              }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="caption" weight="bold">
                  {person?.display_name ?? ''}
                </Text>
                <Text variant="caption" color={colors.faint}>
                  {clockTime(m.created_at)}
                </Text>
              </Row>
              <Text selectable>{m.body}</Text>
            </View>
          </Row>
        );
      })}
      <Row>
        <TextInput
          testID="community-chat-input"
          value={text}
          onChangeText={setText}
          placeholder="כתבו לקהילה…"
          placeholderTextColor={colors.faint}
          multiline
          maxLength={2000}
          style={[
            noOutline,
            {
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              borderRadius: 22,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: space.lg,
              paddingVertical: 11,
              fontFamily: fonts.regular,
              fontSize: 15,
              color: colors.ink,
              textAlign: 'right',
            },
          ]}
        />
        <Pressable
          testID="community-chat-send"
          accessibilityRole="button"
          accessibilityLabel="שליחה"
          disabled={!text.trim() || sending}
          onPress={send}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: text.trim() ? colors.primary : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="send" size={19} color={colors.white} style={{ transform: [{ scaleX: -1 }] }} />
        </Pressable>
      </Row>
      {error && (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      )}
    </View>
  );
}
