import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, useWindowDimensions, View } from 'react-native';

import { CommunityChat } from '@/components/community-chat';
import { ItemCard } from '@/components/item-card';
import { Button, Card, EmptyState, Loading, Row, Segmented, Text } from '@/components/ui';
import { getCommunity, inviteCode, joinCommunity, leaveCommunity, listCommunities, searchItems } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useOrigin } from '@/lib/location';
import type { Community } from '@/lib/types';
import { colors, space } from '@/theme';

type Tab = 'items' | 'chat' | 'subs';

export default function CommunityScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const { userId, requireAuth } = useAuth();
  const { origin } = useOrigin();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, 760) - space.lg * 2 - space.md) / 2;
  const [tab, setTab] = useState<Tab>(tabParam ?? 'items');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    data: c,
    isLoading,
    refetch,
  } = useQuery({ queryKey: ['community', id, userId], queryFn: () => getCommunity(id, origin) });
  const { data: items = [] } = useQuery({
    queryKey: ['community-items', id, c?.is_member],
    queryFn: () =>
      searchItems({ origin, radiusKm: null, query: '', category: null, kind: 'offer', communityId: id }, 0, 60),
    enabled: !!c,
  });
  const { data: subs = [], refetch: refetchSubs } = useQuery({
    queryKey: ['communities', 'subs', id, userId],
    queryFn: () => listCommunities(origin, '', id),
    enabled: !!c && !c.parent_id,
  });
  const { data: code } = useQuery({ queryKey: ['invite', id], queryFn: () => inviteCode(id), enabled: !!c?.is_member });

  if (isLoading) return <Loading />;
  if (!c) return <EmptyState icon="lock-closed-outline" title="הקהילה פרטית" body="צריך קוד הזמנה כדי לראות אותה." />;

  async function toggle() {
    if (!requireAuth()) return;
    setBusy(true);
    try {
      if (c!.is_member) await leaveCommunity(id, userId!);
      else await joinCommunity(id);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    } finally {
      setBusy(false);
    }
  }

  const isTop = !c.parent_id;
  const tabs: { value: Tab; label: string }[] = [
    { value: 'items', label: 'פריטים' },
    ...(c.is_member ? [{ value: 'chat' as const, label: 'שיחה' }] : []),
    ...(isTop ? [{ value: 'subs' as const, label: `קהילות בתוכה${subs.length ? ` (${subs.length})` : ''}` }] : []),
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, gap: space.xl, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <Stack.Screen options={{ title: c.name }} />
        <View style={{ gap: space.sm }}>
          {c.parent_id && (
            <Text
              variant="label"
              color={colors.primary}
              onPress={() => router.push(`/communities/${c.parent_id}`)}
              accessibilityRole="link">
              ↩ חלק מ{c.parent_name}
            </Text>
          )}
          <Text variant="title">{c.name}</Text>
          <Text color={colors.muted}>
            {c.is_private ? '🔒 קהילה פרטית' : '👥 קהילה פתוחה'} · {c.member_count} חברים · {c.active_items} פריטים
            זמינים
          </Text>
          {!!c.description && <Text>{c.description}</Text>}
        </View>

        <Row>
          {(!c.is_private || c.is_member) && (
            <Button
              testID="community-join"
              style={{ flex: 1 }}
              variant={c.is_member ? 'ghost' : 'primary'}
              title={c.is_member ? 'יציאה מהקהילה' : 'הצטרפות'}
              loading={busy}
              onPress={toggle}
            />
          )}
          {c.is_member && (
            <Button style={{ flex: 1 }} icon="add" title="פרסום בקהילה" onPress={() => router.navigate('/post')} />
          )}
        </Row>

        {c.is_member && code && (
          <Card style={{ gap: space.sm }}>
            <Text weight="bold">הזמינו שכנים</Text>
            <Text variant="caption" color={colors.muted}>
              שתפו את הקוד בקבוצת הוואטסאפ של הבניין או השכונה.
            </Text>
            <Row>
              <Text variant="title" color={colors.primary} style={{ flex: 1, letterSpacing: 4 }} selectable>
                {code}
              </Text>
              <Button
                size="sm"
                variant="secondary"
                title={copied ? 'הועתק ✓' : 'העתקה'}
                onPress={async () => {
                  await Clipboard.setStringAsync(code);
                  setCopied(true);
                }}
              />
              <Button
                size="sm"
                icon="share-social"
                title="שיתוף"
                onPress={() =>
                  Share.share({
                    message: `הצטרפו לקהילת "${c.name}" ב-GiveBack — מוסרים ומקבלים בחינם מהשכנים. קוד הזמנה: ${code}`,
                  }).catch(() => {})
                }
              />
            </Row>
          </Card>
        )}

        {tabs.length > 1 && <Segmented value={tab} onChange={setTab} options={tabs} />}

        {tab === 'items' && (
          <View style={{ gap: space.md }}>
            {items.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} width={cardWidth} />
                ))}
              </View>
            ) : (
              <Text color={colors.muted}>עוד אין פריטים. היו הראשונים!</Text>
            )}
          </View>
        )}

        {tab === 'chat' && c.is_member && userId && <CommunityChat communityId={id} userId={userId} />}

        {tab === 'subs' && isTop && (
          <View style={{ gap: space.md }}>
            <Text color={colors.muted}>
              קהילות קטנות בתוך {c.name} — בניין, רחוב, גן או חוג. מי שמצטרף/ת לאחת מהן מצטרף/ת גם ל{c.name}.
            </Text>
            {c.is_member && (
              <Button
                testID="create-sub-community"
                icon="add-circle-outline"
                variant="secondary"
                title={`פתיחת קהילה בתוך ${c.name}`}
                onPress={() =>
                  router.push({ pathname: '/communities/new', params: { parent: c.id, parentName: c.name } })
                }
              />
            )}
            {subs.map((s) => (
              <SubRow key={s.id} community={s} onJoined={refetchSubs} />
            ))}
            {subs.length === 0 && <Text color={colors.muted}>עוד אין קהילות בתוכה.</Text>}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SubRow({ community: s, onJoined }: { community: Community; onJoined: () => void }) {
  const { requireAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <Card
      onPress={() => router.push(`/communities/${s.id}`)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Ionicons name={s.is_private ? 'lock-closed' : 'people'} size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text weight="bold">{s.name}</Text>
        <Text variant="caption" color={colors.muted}>
          {s.member_count} חברים · {s.active_items} פריטים
        </Text>
      </View>
      {s.is_member ? (
        <Text variant="caption" weight="bold" color={colors.primary}>
          חבר/ה ✓
        </Text>
      ) : !s.is_private ? (
        <Button
          size="sm"
          title="הצטרפות"
          loading={busy}
          onPress={async () => {
            if (!requireAuth()) return;
            setBusy(true);
            try {
              await joinCommunity(s.id);
              onJoined();
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </Card>
  );
}
