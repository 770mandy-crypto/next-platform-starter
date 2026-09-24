import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { ItemCard } from '@/components/item-card';
import { ProfileHeader } from '@/components/profile-header';
import { Avatar, Button, Card, EmptyState, IconButton, Loading, Row, Text } from '@/components/ui';
import { getProfile, getStats, listThanks, listUserItems } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/time';
import { colors, space } from '@/theme';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, requireAuth } = useAuth();
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, 760) - space.lg * 2 - space.md) / 2;

  const { data: profile, isLoading } = useQuery({ queryKey: ['profile', id], queryFn: () => getProfile(id) });
  const { data: stats } = useQuery({ queryKey: ['stats', id], queryFn: () => getStats(id) });
  const { data: items = [] } = useQuery({
    queryKey: ['user-items', id],
    queryFn: () => listUserItems(id, ['available', 'reserved']),
  });
  const { data: thanks = [] } = useQuery({ queryKey: ['thanks', id], queryFn: () => listThanks(id) });

  if (isLoading) return <Loading />;
  if (!profile) return <EmptyState icon="person-outline" title="המשתמש/ת לא נמצא/ה" />;

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, gap: space.xl, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () =>
            id !== userId ? (
              <IconButton
                icon="flag-outline"
                label="דיווח"
                onPress={() => requireAuth() && router.push({ pathname: '/report', params: { userId: id } })}
              />
            ) : null,
        }}
      />
      <ProfileHeader profile={profile} stats={stats} />

      <View style={{ gap: space.md }}>
        <Text variant="heading">מוסר/ת עכשיו ({items.length})</Text>
        {items.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {items.map((item) => (
              <ItemCard key={item.id} item={item} width={cardWidth} />
            ))}
          </View>
        ) : (
          <Text color={colors.muted}>אין כרגע פריטים פעילים.</Text>
        )}
      </View>

      <View style={{ gap: space.md }}>
        <Text variant="heading">תודות מהקהילה 💚</Text>
        {thanks.length ? (
          thanks.map((t) => (
            <Card key={t.id} style={{ gap: space.sm }}>
              <Row>
                <Avatar uri={t.from?.avatar_url} name={t.from?.display_name} size={30} />
                <Text weight="bold" style={{ flex: 1 }}>
                  {t.from?.display_name}
                </Text>
                <Text variant="caption" color={colors.faint}>
                  {timeAgo(t.created_at)}
                </Text>
              </Row>
              <Text>{t.body}</Text>
            </Card>
          ))
        ) : (
          <Text color={colors.muted}>עוד אין תודות.</Text>
        )}
      </View>
      {id === userId && <Button variant="ghost" title="עריכת הפרופיל" onPress={() => router.push('/edit-profile')} />}
    </ScrollView>
  );
}
