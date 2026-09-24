import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { Button, Card, EmptyState, Field, Loading, Row, Text } from '@/components/ui';
import { joinCommunity, listCommunities } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { COMMUNITY_KINDS } from '@/lib/catalog';
import { formatDistance } from '@/lib/geo';
import { useOrigin } from '@/lib/location';
import type { Community } from '@/lib/types';
import { colors, space } from '@/theme';

export default function Communities() {
  const { requireAuth } = useAuth();
  const { origin } = useOrigin();
  const [query, setQuery] = useState('');
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['communities', origin?.lat, origin?.lng, query],
    queryFn: () => listCommunities(origin, query.trim()),
  });

  async function joinByCode() {
    if (!requireAuth()) return;
    setJoining(true);
    setError(null);
    try {
      const id = await joinCommunity(null, code);
      setCode('');
      router.push(`/communities/${id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: space.lg, gap: space.md, maxWidth: 760, width: '100%', alignSelf: 'center' }}
      ListHeaderComponent={
        <View style={{ gap: space.lg, marginBottom: space.sm }}>
          <Text color={colors.muted}>
            קהילה היא קבוצה קטנה שמכירה — בניין, שכונה, גן, קיבוץ. פריטים שמפורסמים בקהילה פרטית נראים רק לחברים בה.
          </Text>
          <Card style={{ gap: space.sm }}>
            <Text weight="bold">קיבלת קוד הזמנה?</Text>
            <Row>
              <View style={{ flex: 1 }}>
                <Field
                  placeholder="ABC123"
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  maxLength={8}
                />
              </View>
              <Button title="הצטרפות" onPress={joinByCode} loading={joining} disabled={code.trim().length < 4} />
            </Row>
            {error && (
              <Text variant="caption" color={colors.danger}>
                {error}
              </Text>
            )}
          </Card>
          <Button
            icon="add-circle-outline"
            variant="secondary"
            title="פתיחת קהילה חדשה"
            onPress={() => requireAuth() && router.push('/communities/new')}
          />
          <Field placeholder="חיפוש קהילה או עיר…" value={query} onChangeText={setQuery} />
        </View>
      }
      renderItem={({ item }) => <CommunityRow community={item} onJoined={refetch} />}
      ListEmptyComponent={
        isLoading ? (
          <Loading />
        ) : (
          <EmptyState
            icon="people-outline"
            title="אין עדיין קהילות כאן"
            body="פתחו את הראשונה — לבניין, לשכונה או לגן."
          />
        )
      }
    />
  );
}

function CommunityRow({ community: c, onJoined }: { community: Community; onJoined: () => void }) {
  const { requireAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  const kind = COMMUNITY_KINDS.find((k) => k.id === c.kind)?.label ?? '';
  return (
    <Card
      onPress={() => router.push(`/communities/${c.id}`)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={c.is_private ? 'lock-closed' : 'people'} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight="bold">{c.name}</Text>
        <Text variant="caption" color={colors.muted}>
          {[
            c.parent_name ? `בתוך ${c.parent_name}` : null,
            kind,
            c.city,
            `${c.member_count} חברים`,
            `${c.active_items} פריטים`,
            c.distance_km != null ? formatDistance(c.distance_km) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      {c.is_member ? (
        <Text variant="caption" weight="bold" color={colors.primary}>
          חבר/ה ✓
        </Text>
      ) : !c.is_private ? (
        <Button
          size="sm"
          title="הצטרפות"
          loading={busy}
          onPress={async () => {
            if (!requireAuth()) return;
            setBusy(true);
            try {
              await joinCommunity(c.id);
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
