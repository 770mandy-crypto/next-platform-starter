import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, useWindowDimensions, View } from 'react-native';

import { ItemCard } from '@/components/item-card';
import { Button, Card, EmptyState, Loading, Row, Text } from '@/components/ui';
import { getCommunity, inviteCode, joinCommunity, leaveCommunity, searchItems } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useOrigin } from '@/lib/location';
import { colors, space } from '@/theme';

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, requireAuth } = useAuth();
  const { origin } = useOrigin();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, 760) - space.lg * 2 - space.md) / 2;
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

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.xl, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: c.name }} />
      <View style={{ gap: space.sm }}>
        <Text variant="title">{c.name}</Text>
        <Text color={colors.muted}>
          {c.is_private ? '🔒 קהילה פרטית' : '👥 קהילה פתוחה'} · {c.member_count} חברים · {c.active_items} פריטים זמינים
        </Text>
        {!!c.description && <Text>{c.description}</Text>}
      </View>

      <Row>
        {(!c.is_private || c.is_member) && (
          <Button
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

      <View style={{ gap: space.md }}>
        <Text variant="heading">פריטים בקהילה</Text>
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
    </ScrollView>
  );
}
