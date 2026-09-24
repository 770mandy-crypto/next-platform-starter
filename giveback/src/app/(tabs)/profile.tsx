import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemCard } from '@/components/item-card';
import { ProfileHeader } from '@/components/profile-header';
import { Button, Card, Divider, EmptyState, ListItem, Segmented, Text } from '@/components/ui';
import { deleteAccount, getStats, listUserItems } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/theme';

export default function ProfileTab() {
  const { userId, profile, signOut } = useAuth();
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 760);
  const cardWidth = (contentWidth - space.lg * 2 - space.md) / 2;

  const { data: stats } = useQuery({
    queryKey: ['stats', userId],
    queryFn: () => getStats(userId!),
    enabled: !!userId,
  });
  const { data: items = [] } = useQuery({
    queryKey: ['my-items', userId, tab],
    queryFn: () => listUserItems(userId!, tab === 'active' ? ['available', 'reserved'] : ['given']),
    enabled: !!userId,
  });

  if (!userId || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <EmptyState
          icon="person-circle-outline"
          title="ברוכים הבאים ל-GiveBack"
          body="מוסרים ומקבלים בחינם, מהשכנים הכי קרובים."
          action={<Button title="התחברות / הרשמה" onPress={() => router.push('/sign-in')} />}
        />
      </SafeAreaView>
    );
  }

  function confirmDelete() {
    const run = async () => {
      try {
        await deleteAccount(userId!);
        router.replace('/');
      } catch (e) {
        Alert.alert('המחיקה נכשלה', (e as Error).message);
      }
    };
    const text = 'כל הפריטים, השיחות והתמונות שלך יימחקו לצמיתות.';
    if (Platform.OS === 'web') {
      if (window.confirm(`למחוק את החשבון? ${text}`)) run();
      return;
    }
    Alert.alert('למחוק את החשבון?', text, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחיקה', style: 'destructive', onPress: run },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.xl, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <ProfileHeader profile={profile} stats={stats} />
        {stats && stats.given_count > 0 && (
          <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
            <Text weight="bold" color={colors.primaryDark}>
              🌍 מסרת {stats.given_count === 1 ? 'פריט אחד' : `${stats.given_count} פריטים`} במקום שייזרקו. תודה!
            </Text>
          </Card>
        )}

        <View style={{ gap: space.md }}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'active', label: 'פעילים' },
              { value: 'done', label: 'נמסרו' },
            ]}
          />
          {items.length === 0 ? (
            <Text color={colors.muted} style={{ textAlign: 'center', paddingVertical: space.lg }}>
              {tab === 'active' ? 'אין כרגע פריטים פעילים.' : 'עוד לא נמסרו פריטים.'}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
              {items.map((item) => (
                <ItemCard key={item.id} item={item} width={cardWidth} />
              ))}
            </View>
          )}
        </View>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <ListItem icon="create-outline" title="עריכת פרופיל" onPress={() => router.push('/edit-profile')} />
          <Divider />
          <ListItem icon="heart-outline" title="פריטים ששמרתי" onPress={() => router.push('/favorites')} />
          <Divider />
          <ListItem
            icon="notifications-outline"
            title="התראות חיפוש"
            subtitle="נודיע כשמשהו שאתם מחפשים מתפרסם"
            onPress={() => router.push('/alerts')}
          />
          <Divider />
          <ListItem icon="people-outline" title="הקהילות שלי" onPress={() => router.push('/communities')} />
          <Divider />
          <ListItem icon="person-outline" title="הפרופיל הציבורי שלי" onPress={() => router.push(`/user/${userId}`)} />
        </Card>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <ListItem
            icon="shield-checkmark-outline"
            title="מדיניות פרטיות"
            onPress={() => router.push('/legal/privacy')}
          />
          <Divider />
          <ListItem icon="document-text-outline" title="תנאי שימוש" onPress={() => router.push('/legal/terms')} />
          <Divider />
          <ListItem icon="log-out-outline" title="התנתקות" onPress={signOut} />
          <Divider />
          <ListItem icon="trash-outline" title="מחיקת החשבון" tone={colors.danger} onPress={confirmDelete} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
